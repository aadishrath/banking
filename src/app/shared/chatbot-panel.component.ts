import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatbotService } from '../core/chatbot.service';
import { BankingStoreService } from '../core/banking-store.service';

@Component({
  selector: 'app-chatbot-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chatbot-panel.component.html',
  styleUrl: './chatbot-panel.component.scss'
})
export class ChatbotPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly chatbot = inject(ChatbotService);
  readonly store = inject(BankingStoreService);
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly form = this.fb.nonNullable.group({
    prompt: ['', [Validators.required]]
  });

  isOpen = false;

  constructor() {
    effect(() => {
      this.store.chatMessages();
      queueMicrotask(() => {
        const node = this.viewport()?.nativeElement;
        if (node) {
          node.scrollTop = node.scrollHeight;
        }
      });
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const prompt = this.form.getRawValue().prompt.trim();
    await this.chatbot.handle(prompt);
    this.form.reset({ prompt: '' });
  }
}
