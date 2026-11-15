'use client'

export type RespostaApi<T> = { ok: boolean; status: number; data: T | null; erro?: string; campos?: Record<string, string>; requerConfirmacao?: boolean }

/** Wrapper de fetch para as APIs internas com tratamento padronizado de erros em pt-BR. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<RespostaApi<T>> {
  try {
    const res = await fetch(url, {
      ...(init ?? {}),
      headers: { 'Content-Type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) },
    })
    let json: Record<string, unknown> | null = null
    try {
      json = (await res.json()) as Record<string, unknown>
    } catch {
      json = null
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        erro: (json?.erro as string) ?? `Erro ${res.status} ao comunicar com o servidor.`,
        campos: (json?.campos as Record<string, string>) ?? undefined,
        requerConfirmacao: Boolean(json?.requerConfirmacao),
      }
    }
    return { ok: true, status: res.status, data: (json as T) ?? null }
  } catch (e) {
    return { ok: false, status: 0, data: null, erro: (e as Error)?.message ?? 'Falha de conexão.' }
  }
}
