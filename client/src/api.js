import axios from 'axios';

// O site vai procurar o servidor na porta 3001
export const api = axios.create({
  baseURL: 'http://localhost:3001'
});