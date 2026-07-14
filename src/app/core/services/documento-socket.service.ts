import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class DocumentoSocketService {
  private client!: Client;
  private messageSubject = new Subject<any>();

  conectar(documentoId: string, username: string): Observable<any> {
    const socket = new SockJS('/ws');
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('STOMP: ' + str),
      reconnectDelay: 5000,
    });

    this.client.onConnect = (frame) => {
      console.log('Conectado a WebSocket de Colaboración de Documento');
      
      this.client.subscribe(`/topic/documento/${documentoId}`, (message) => {
        if (message.body) {
          this.messageSubject.next(JSON.parse(message.body));
        }
      });

      this.client.publish({
        destination: `/app/documento/${documentoId}/unirse`,
        body: JSON.stringify({ username })
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Error de STOMP: ' + frame.headers['message']);
    };

    this.client.activate();

    return this.messageSubject.asObservable();
  }

  enviarOperacion(documentoId: string, username: string, operacion: any) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: `/app/documento/${documentoId}/operacion`,
        body: JSON.stringify({
          username,
          ...operacion
        })
      });
    }
  }

  desconectar(documentoId: string, username: string) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: `/app/documento/${documentoId}/salir`,
        body: JSON.stringify({ username })
      });
      this.client.deactivate();
    }
  }
}
