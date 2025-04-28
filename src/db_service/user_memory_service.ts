import { Reference } from 'firebase-admin/database';
import { db } from '../michi.js';

interface UserMemory {
  userId: string;
  userName: string;
  nicknames: string[];
  preferences: {
    likes: string[];
    dislikes: string[];
  };
  reminders: {
    message: string;
    targetUser: string;
    timestamp: number;
    completed: boolean;
  }[];
  importantFacts: string[];
  lastSeen: number;
  lastInteraction: number;
}

export class UserMemoryService {
  private databaseRef: Reference;
  private readonly MAX_REMINDERS = 10;
  private readonly MAX_FACTS = 20;

  constructor() {
    this.databaseRef = db.child('userMemory');
  }

  async getUserMemory(userId: string): Promise<UserMemory | null> {
    try {
      const snapshot = await this.databaseRef.child(userId).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error getting user memory:', error);
      return null;
    }
  }

  async updateUserMemory(userId: string, updates: Partial<UserMemory>): Promise<void> {
    try {
      const currentMemory = await this.getUserMemory(userId) || {
        userId,
        userName: updates.userName || 'Unknown',
        nicknames: [],
        preferences: { likes: [], dislikes: [] },
        reminders: [],
        importantFacts: [],
        lastSeen: Date.now(),
        lastInteraction: Date.now()
      };

      const updatedMemory = {
        ...currentMemory,
        ...updates,
        lastSeen: Date.now(),
        lastInteraction: Date.now()
      };

      await this.databaseRef.child(userId).set(updatedMemory);
    } catch (error) {
      console.error('Error updating user memory:', error);
    }
  }

  async addReminder(userId: string, reminder: {
    message: string;
    targetUser: string;
    timestamp: number;
  }): Promise<void> {
    try {
      const memory = await this.getUserMemory(userId);
      if (!memory) return;

      const reminders = memory.reminders || [];
      if (reminders.length >= this.MAX_REMINDERS) {
        reminders.shift(); // Remove oldest reminder
      }

      reminders.push({ ...reminder, completed: false });
      await this.updateUserMemory(userId, { reminders });
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  }

  async addImportantFact(userId: string, fact: string): Promise<void> {
    try {
      const memory = await this.getUserMemory(userId);
      if (!memory) return;

      const facts = memory.importantFacts || [];
      if (facts.length >= this.MAX_FACTS) {
        facts.shift(); // Remove oldest fact
      }

      facts.push(fact);
      await this.updateUserMemory(userId, { importantFacts: facts });
    } catch (error) {
      console.error('Error adding important fact:', error);
    }
  }

  async getPendingReminders(): Promise<Array<{
    userId: string;
    reminder: UserMemory['reminders'][0];
  }>> {
    try {
      const snapshot = await this.databaseRef.once('value');
      const memories = snapshot.val() || {};
      
      const pendingReminders: Array<{
        userId: string;
        reminder: UserMemory['reminders'][0];
      }> = [];

      Object.entries(memories).forEach(([userId, memory]: [string, any]) => {
        if (memory.reminders) {
          memory.reminders.forEach((reminder: UserMemory['reminders'][0]) => {
            if (!reminder.completed && reminder.timestamp <= Date.now()) {
              pendingReminders.push({ userId, reminder });
            }
          });
        }
      });

      return pendingReminders;
    } catch (error) {
      console.error('Error getting pending reminders:', error);
      return [];
    }
  }

  async markReminderCompleted(userId: string, reminderIndex: number): Promise<void> {
    try {
      const memory = await this.getUserMemory(userId);
      if (!memory || !memory.reminders) return;

      memory.reminders[reminderIndex].completed = true;
      await this.updateUserMemory(userId, { reminders: memory.reminders });
    } catch (error) {
      console.error('Error marking reminder completed:', error);
    }
  }
} 