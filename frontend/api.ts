export const API_URL = 'http://192.168.29.119:5000/api';
export const SOCKET_URL = 'http://192.168.29.119:5000';

const getHeaders = () => {
  const token = localStorage.getItem('smashtrack_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async patch(endpoint: string, data: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};
