// SPDX-License-Identifier: Apache-2.0
/**
 * Task Manager - Phase 1 Foundation
 * Handles task assignment, progress tracking, and lifecycle management
 */

const fs = require('fs');

class TaskManager {
  constructor(config) {
    this.config = config;
    this.tasks = new Map();
    this.taskRegistryObjId = config.registryObjId || null;
  }

  /**
   * Create a new task from registry object
   */
  createTask(taskData) {
    const taskId = `${taskData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      type: taskData.type, // 'forecast', 'aggregate', 'commit'
      description: taskData.description || `Task of type ${taskData.type}`,
      priority: taskData.priority || 'normal',
      status: 'pending', // pending, running, completed, failed
      createdAt: new Date().toISOString(),
      metadata: taskData.metadata || {},
      progress: 0,
      results: null
    };

    this.tasks.set(taskId, task);
    console.log(`[TaskManager] Created task ${taskId}: ${task.description}`);
    
    return task;
  }

  /**
   * Update task progress and track results
   */
  updateProgress(taskId, progress, results = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.progress = progress;
    task.results = results || task.results;
    task.updatedAt = new Date().toISOString();

    // Mark as completed if progress reaches 100
    if (progress >= 100) {
      task.status = 'completed';
    } else if (results && results.error) {
      task.status = 'failed';
    }

    console.log(`[TaskManager] Task ${taskId} updated: progress=${progress}, status=${task.status}`);
    
    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * List all tasks with optional filter
   */
  listTasks(filter = {}) {
    let result = Array.from(this.tasks.values());
    
    if (filter.status) {
      result = result.filter(t => t.status === filter.status);
    }
    if (filter.type) {
      result = result.filter(t => t.type === filter.type);
    }

    return result;
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks() {
    return this.listTasks({ status: 'pending' });
  }

  /**
   * Clean up completed/failed tasks (configurable retention)
   */
  cleanupCompleted(maxAgeMs = 3600000) { // default: 1 hour
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        const age = now - new Date(task.updatedAt).getTime();
        if (age > maxAgeMs) {
          this.tasks.delete(id);
          cleaned++;
        }
      }
    }

    console.log(`[TaskManager] Cleanup completed: removed ${cleaned} tasks`);
    return cleaned;
  }

  /**
   * Persist task state to disk
   */
  persist() {
    const data = Array.from(this.tasks.values()).map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      progress: t.progress,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      metadata: t.metadata,
      results: t.results
    }));

    const outputPath = path.join(this.config.dataDir, 'tasks.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`[TaskManager] Persisted ${data.length} tasks to ${outputPath}`);
  }
}

// Export for module use
module.exports = { TaskManager };
