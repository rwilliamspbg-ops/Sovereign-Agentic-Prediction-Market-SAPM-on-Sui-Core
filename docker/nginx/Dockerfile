FROM nginx:stable
COPY default.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
