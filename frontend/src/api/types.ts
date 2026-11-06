export interface ErrorResponse {
  error: string
}

export interface HealthResponse {
  status: string
}

export interface Credentials {
  email: string
  password: string
}

export interface Owner {
  id: string
  email: string
}

export interface LoginResponse {
  token: string
}
