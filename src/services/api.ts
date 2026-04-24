import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { ENV } from '../config/env'
import type {
  CheckInPayload,
  CheckInResult,
  EnrollResult,
  EnrollmentPayload,
} from '../types'

/**
 * Single axios instance used app-wide. Every outbound HTTP request MUST go
 * through this module — direct `fetch` calls are forbidden by project policy
 * so we can centralize auth, timeouts, retries and telemetry.
 */
const api: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  headers: {
    'X-API-Key': ENV.WORKGUARD_API_KEY,
    'Content-Type': 'application/json',
    'X-Client': 'workguard-rn',
  },
  timeout: 15_000,
})

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // Surface a compact, structured error so UI layers can render it
    // without having to know about axios internals.
    const status = err.response?.status
    const url = err.config?.url
    const body = err.response?.data
    // eslint-disable-next-line no-console
    console.warn(`[api] ${err.code ?? 'ERR'} ${status ?? '-'} ${url ?? ''}`, body)
    return Promise.reject(err)
  },
)

export const enrollWorker = async (
  payload: EnrollmentPayload,
): Promise<EnrollResult> => {
  const { data } = await api.post<EnrollResult>('/workguard/enroll', payload)
  return data
}

export const checkInWorker = async (
  payload: CheckInPayload,
): Promise<CheckInResult> => {
  const { data } = await api.post<CheckInResult>('/workguard/checkin', payload)
  return data
}

/** Fire-and-forget signal ingestion. Never throws. */
export const submitSignals = async (
  channel: string,
  batch: unknown[],
): Promise<void> => {
  try {
    await api.post('/api/signals', {
      channel,
      batch,
      source: 'workguard-rn',
    })
  } catch {
    /* intentionally swallowed — signals are best-effort */
  }
}

export default api
