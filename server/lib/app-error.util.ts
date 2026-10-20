import type {
  AppErrorCode,
  AppErrorParams,
} from '@shared/common/app-error.type'
import { TRPCError } from '@trpc/server'

/** Portée par `TRPCError.cause` ; l'`errorFormatter` (init.ts) l'expose au client. */
export class AppErrorCause extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly params?: unknown,
  ) {
    super(code)
    this.name = 'AppErrorCause'
  }
}

/**
 * `throw appError("NOT_FOUND", "IMPORT_NOT_FOUND")`. Le `message` du TRPCError est le code (lisible
 * dans les logs) ; le paramètre n'est demandé que pour les codes de `AppErrorParams`.
 */
export function appError<Code extends AppErrorCode>(
  trpcCode: TRPCError['code'],
  code: Code,
  ...params: Code extends keyof AppErrorParams
    ? [params: AppErrorParams[Code]]
    : []
): TRPCError {
  return new TRPCError({
    code: trpcCode,
    message: code,
    cause: new AppErrorCause(code, params[0]),
  })
}
