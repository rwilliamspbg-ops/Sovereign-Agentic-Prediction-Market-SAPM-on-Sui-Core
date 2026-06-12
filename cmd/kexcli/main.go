// SPDX-License-Identifier: Apache-2.0
package main

import (
	"bufio"
	crand "crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"

	"github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core/crypto"
	"golang.org/x/crypto/chacha20poly1305"
)

type deriveSessionOutput struct {
	Algorithm      string `json:"algorithm"`
	SessionKey     string `json:"sessionKey"`
	Nonce          string `json:"nonce"`
	PeerKeyDigest  string `json:"peerKeyDigest"`
	Ciphertext     string `json:"ciphertext,omitempty"`
	ProviderPublic string `json:"providerPublic,omitempty"`
}

func writeBlob(w io.Writer, b []byte) error {
	var lenb uint32 = uint32(len(b))
	if err := binary.Write(w, binary.BigEndian, lenb); err != nil {
		return err
	}
	_, err := w.Write(b)
	return err
}

func readBlob(r io.Reader) ([]byte, error) {
	var lenb uint32
	if err := binary.Read(r, binary.BigEndian, &lenb); err != nil {
		return nil, err
	}
	buf := make([]byte, lenb)
	_, err := io.ReadFull(r, buf)
	return buf, err
}

func runServer(listen string, pskFile string) error {
	ln, err := net.Listen("tcp", listen)
	if err != nil {
		return err
	}
	defer ln.Close()
	log.Printf("listening on %s", listen)
	// Load server PSK if provided
	var serverPSK []byte
	if pskFile != "" {
		if data, err := os.ReadFile(pskFile); err == nil {
			// assume base64-encoded in file
			if decoded, err := base64.StdEncoding.DecodeString(string(data)); err == nil {
				serverPSK = decoded
				log.Printf("server loaded PSK from %s", pskFile)
			}
		}
	}
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("accept: %v", err)
			continue
		}
		go handleConn(conn, pskFile, false, serverPSK)
	}
}

func runClient(addr string, pskFile string) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return err
	}
	defer conn.Close()
	return handleConn(conn, pskFile, true, nil)
}

func handleConn(conn net.Conn, pskFile string, isClient bool, serverPSK []byte) error {
	defer conn.Close()
	// Create hybrid keys
	me, err := crypto.NewHybridKEX()
	if err != nil {
		return err
	}
	myPub := me.ExportPublic()

	if isClient {
		// If client has PSK file, attempt PSK resumption first
		if pskFile != "" {
			if data, err := os.ReadFile(pskFile); err == nil {
				// send PSK blob (base64 in file)
				blob := append([]byte("PSK:"), data...)
				if err := writeBlob(conn, blob); err == nil {
					// locally decode PSK and derive session keys
					if decoded, err := base64.StdEncoding.DecodeString(string(data)); err == nil {
						info := []byte("SAPM hybrid kex v1")
						sk, err := crypto.DeriveSessionKeys(decoded, nil, info, 32)
						if err != nil {
							return err
						}
						log.Printf("PSK resumption used; derived session keys")
						// interactive: read stdin and send encrypted messages
						aead, _ := chacha20poly1305.New(sk.ClientWriteKey)
						stdin := bufio.NewReader(os.Stdin)
						for {
							fmt.Print("msg> ")
							line, err := stdin.ReadString('\n')
							if err != nil {
								return err
							}
							nonce := make([]byte, chacha20poly1305.NonceSize)
							if _, err := crand.Read(nonce); err != nil {
								return err
							}
							ct := aead.Seal(nil, nonce, []byte(line), nil)
							if err := writeBlob(conn, append(nonce, ct...)); err != nil {
								return err
							}
						}
					}
				}
			}
		}
		// send my pub first
		if err := writeBlob(conn, myPub); err != nil {
			return err
		}
		// receive peer pub
		peerPub, err := readBlob(conn)
		if err != nil {
			return err
		}
		// encapsulate to peer
		shared, ct, err := me.Encapsulate(peerPub)
		if err != nil {
			return err
		}
		// send ciphertext
		if err := writeBlob(conn, ct); err != nil {
			return err
		}
		// derive session keys
		info := []byte("SAPM hybrid kex v1")
		sk, err := crypto.DeriveSessionKeys(shared, nil, info, 32)
		if err != nil {
			return err
		}
		if pskFile != "" {
			psk, _ := crypto.DeriveResumptionPSK(shared, nil, info, 32)
			os.WriteFile(pskFile, []byte(base64.StdEncoding.EncodeToString(psk)), 0600)
			log.Printf("wrote resumption PSK to %s", pskFile)
		}
		// interactive: read stdin and send encrypted messages
		aead, _ := chacha20poly1305.New(sk.ClientWriteKey)
		stdin := bufio.NewReader(os.Stdin)
		for {
			fmt.Print("msg> ")
			line, err := stdin.ReadString('\n')
			if err != nil {
				return err
			}
			// encrypt and send (nonce + ciphertext)
			nonce := make([]byte, chacha20poly1305.NonceSize)
			if _, err := crand.Read(nonce); err != nil {
				return err
			}
			ct := aead.Seal(nil, nonce, []byte(line), nil)
			if err := writeBlob(conn, append(nonce, ct...)); err != nil {
				return err
			}
		}
	} else {
		// server: receive peer pub first
		peerPub, err := readBlob(conn)
		if err != nil {
			return err
		}
		// Check for PSK resumption blob (prefixed with "PSK:")
		if len(peerPub) > 4 && string(peerPub[:4]) == "PSK:" {
			// if server has PSK loaded, compare
			if len(serverPSK) > 0 {
				clientPSKb64 := peerPub[4:]
				clientPSK, err := base64.StdEncoding.DecodeString(string(clientPSKb64))
				if err == nil && len(clientPSK) == len(serverPSK) {
					ok := true
					for i := range clientPSK {
						if clientPSK[i] != serverPSK[i] {
							ok = false
							break
						}
					}
					if ok {
						// PSK matches: derive session keys and proceed to AEAD receive
						info := []byte("SAPM hybrid kex v1")
						sk, err := crypto.DeriveSessionKeys(clientPSK, nil, info, 32)
						if err != nil {
							return err
						}
						log.Printf("PSK resumption accepted; derived session keys")
						aead, _ := chacha20poly1305.New(sk.ClientWriteKey)
						for {
							blob, err := readBlob(conn)
							if err != nil {
								return err
							}
							if len(blob) < chacha20poly1305.NonceSize {
								log.Printf("malformed message")
								continue
							}
							nonce := blob[:chacha20poly1305.NonceSize]
							ct := blob[chacha20poly1305.NonceSize:]
							pt, err := aead.Open(nil, nonce, ct, nil)
							if err != nil {
								log.Printf("decrypt error: %v", err)
								continue
							}
							fmt.Printf("msg: %s", string(pt))
						}
					}
				}
			}
			// if no PSK match, fallthrough to regular handshake (tolerate)
		}
		// send my pub
		if err := writeBlob(conn, myPub); err != nil {
			return err
		}
		// receive ciphertext
		ct, err := readBlob(conn)
		if err != nil {
			return err
		}
		shared, err := me.Decapsulate(peerPub, ct)
		if err != nil {
			return err
		}
		info := []byte("SAPM hybrid kex v1")
		sk, err := crypto.DeriveSessionKeys(shared, nil, info, 32)
		if err != nil {
			return err
		}
		if pskFile != "" {
			psk, _ := crypto.DeriveResumptionPSK(shared, nil, info, 32)
			os.WriteFile(pskFile, []byte(base64.StdEncoding.EncodeToString(psk)), 0600)
			log.Printf("wrote resumption PSK to %s", pskFile)
		}
		// Now receive encrypted messages
		aead, _ := chacha20poly1305.New(sk.ClientWriteKey)
		for {
			blob, err := readBlob(conn)
			if err != nil {
				return err
			}
			if len(blob) < chacha20poly1305.NonceSize {
				log.Printf("malformed message")
				continue
			}
			nonce := blob[:chacha20poly1305.NonceSize]
			ct := blob[chacha20poly1305.NonceSize:]
			pt, err := aead.Open(nil, nonce, ct, nil)
			if err != nil {
				log.Printf("decrypt error: %v", err)
				continue
			}
			fmt.Printf("msg: %s", string(pt))
		}
	}
}

func exportPublic() error {
	me, err := crypto.NewHybridKEX()
	if err != nil {
		return err
	}
	fmt.Println(base64.StdEncoding.EncodeToString(me.ExportPublic()))
	return nil
}

func deriveSession(peerPubB64 string, attestationDigestB64 string) error {
	peerPub, err := base64.StdEncoding.DecodeString(peerPubB64)
	if err != nil {
		return fmt.Errorf("decode peer public: %w", err)
	}
	attestationDigest, err := base64.StdEncoding.DecodeString(attestationDigestB64)
	if err != nil {
		return fmt.Errorf("decode attestation digest: %w", err)
	}

	me, err := crypto.NewHybridKEX()
	if err != nil {
		return err
	}

	shared, ct, err := me.Encapsulate(peerPub)
	if err != nil {
		return err
	}

	key, err := crypto.DeriveSymmetricKey(shared, attestationDigest, []byte("sapm-orchestrator-hybrid-kex-v1"), 32)
	if err != nil {
		return err
	}

	peerDigest := sha256.Sum256(peerPub)
	result := deriveSessionOutput{
		Algorithm:      "x25519-mlkem768-go-bridge",
		SessionKey:     base64.StdEncoding.EncodeToString(key),
		Nonce:          base64.StdEncoding.EncodeToString(ct),
		PeerKeyDigest:  hex.EncodeToString(peerDigest[:]),
		Ciphertext:     base64.StdEncoding.EncodeToString(ct),
		ProviderPublic: base64.StdEncoding.EncodeToString(me.ExportPublic()),
	}

	encoded, err := json.Marshal(result)
	if err != nil {
		return err
	}
	fmt.Println(string(encoded))
	return nil
}

func main() {
	mode := flag.String("mode", "server", "server or client")
	addr := flag.String("addr", ":9000", "listen address (server) or server address (client)")
	pskFile := flag.String("psk", "", "optional resumption PSK output file")
	peerPubB64 := flag.String("peer-public-b64", "", "peer public key material in base64 for provider mode")
	attestationDigestB64 := flag.String("attestation-digest-b64", "", "attestation digest in base64 for provider mode")
	flag.Parse()

	if *mode == "export-public" {
		if err := exportPublic(); err != nil {
			log.Fatalf("export-public error: %v", err)
		}
		return
	}

	if *mode == "derive-session" {
		if *peerPubB64 == "" || *attestationDigestB64 == "" {
			log.Fatalf("derive-session requires -peer-public-b64 and -attestation-digest-b64")
		}
		if err := deriveSession(*peerPubB64, *attestationDigestB64); err != nil {
			log.Fatalf("derive-session error: %v", err)
		}
		return
	}

	if *mode == "server" {
		if err := runServer(*addr, *pskFile); err != nil {
			log.Fatalf("server error: %v", err)
		}
	} else {
		if err := runClient(*addr, *pskFile); err != nil {
			log.Fatalf("client error: %v", err)
		}
	}
}
