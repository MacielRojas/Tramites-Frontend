import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ChatMessage { role: 'user' | 'assistant'; content: string; ts: Date; }

@Component({
  selector: 'app-cli-asistente-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cli-asistente-ia.component.html',
  styleUrl: './cli-asistente-ia.component.scss'
})
export class CliAsistenteIaComponent implements AfterViewChecked {
  @ViewChild('chatEnd') chatEnd!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);

  messages   = signal<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte con tus trámites?', ts: new Date() }
  ]);
  inputText  = signal('');
  loading    = signal(false);
  error      = signal('');

  private shouldScroll = false;

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.chatEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text || this.loading()) return;

    this.messages.update(m => [...m, { role: 'user', content: text, ts: new Date() }]);
    this.inputText.set('');
    this.loading.set(true);
    this.error.set('');
    this.shouldScroll = true;

    this.http.post<{ respuesta: string }>('/ia-svc/api/ia/consulta', { consulta: text }).subscribe({
      next: res => {
        this.messages.update(m => [...m, { role: 'assistant', content: res.respuesta, ts: new Date() }]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.error.set('No se pudo conectar con el asistente. Verifica que el servicio IA esté activo.');
        this.loading.set(false);
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  clearChat(): void {
    this.messages.set([
      { role: 'assistant', content: '¡Chat reiniciado! ¿En qué puedo ayudarte?', ts: new Date() }
    ]);
    this.error.set('');
  }
}
