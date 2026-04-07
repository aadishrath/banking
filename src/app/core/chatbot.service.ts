import { Injectable, inject } from '@angular/core';
import { BankingStoreService } from './banking-store.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly store = inject(BankingStoreService);
  private readonly api = inject(ApiService);

  async handle(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    this.store.pushUserMessage(trimmed);

    try {
      const response = (await this.api.sendChat(trimmed)) as {
        reply: string;
        chat: ReturnType<BankingStoreService['chatMessages']>;
        activity: ReturnType<BankingStoreService['activity']>;
      };
      this.store.applyChatUpdate(response.chat, response.activity);
    } catch (error: unknown) {
      this.store.pushAssistantMessage(
        (error as { error?: { message?: string } })?.error?.message ||
          'The chatbot is unavailable right now.'
      );
    }
  }
}
