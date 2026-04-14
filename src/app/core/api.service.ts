import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_BASE_URL =
  globalThis.location?.hostname === 'localhost'
    ? 'http://localhost:4000/api'
    : 'https://banking-jmkt.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'banking-api-token';

  get token() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  async login(username: string, password: string) {
    return firstValueFrom(
      this.http.post<{ token: string; user: unknown; data: unknown }>(`${API_BASE_URL}/auth/login`, {
        username,
        password
      })
    );
  }

  async me() {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/auth/me`, { headers: this.authHeaders() }));
  }

  async logout() {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/auth/logout`, {}, { headers: this.authHeaders() }));
  }

  async bootstrap() {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/bootstrap`, { headers: this.authHeaders() }));
  }

  async transfer(payload: unknown) {
    return firstValueFrom(
      this.http.post(`${API_BASE_URL}/actions/transfer`, payload, { headers: this.authHeaders() })
    );
  }

  async payCard(payload: unknown) {
    return firstValueFrom(
      this.http.post(`${API_BASE_URL}/actions/pay-card`, payload, { headers: this.authHeaders() })
    );
  }

  async setCardFrozen(payload: unknown) {
    return firstValueFrom(
      this.http.post(`${API_BASE_URL}/actions/card/freeze`, payload, {
        headers: this.authHeaders()
      })
    );
  }

  async sendChat(prompt: string) {
    return firstValueFrom(
      this.http.post(`${API_BASE_URL}/chat`, { prompt }, { headers: this.authHeaders() })
    );
  }

  async patchProfile(payload: unknown) {
    return firstValueFrom(
      this.http.patch(`${API_BASE_URL}/profile`, payload, { headers: this.authHeaders() })
    );
  }

  async patchPermissions(payload: unknown) {
    return firstValueFrom(
      this.http.patch(`${API_BASE_URL}/permissions`, payload, { headers: this.authHeaders() })
    );
  }

  async listUsers() {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/users`, { headers: this.authHeaders() }));
  }

  async createUser(payload: unknown) {
    return firstValueFrom(
      this.http.post(`${API_BASE_URL}/users`, payload, { headers: this.authHeaders() })
    );
  }

  async updateUser(id: string, payload: unknown) {
    return firstValueFrom(
      this.http.patch(`${API_BASE_URL}/users/${id}`, payload, { headers: this.authHeaders() })
    );
  }

  async deleteUser(id: string) {
    return firstValueFrom(
      this.http.delete(`${API_BASE_URL}/users/${id}`, { headers: this.authHeaders() })
    );
  }

  private authHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });
  }
}
