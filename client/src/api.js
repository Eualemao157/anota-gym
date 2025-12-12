import axios from 'axios';

// baseURL vazia significa: "Use o mesmo endereço do site"
export const api = axios.create({
  baseURL: ''
});