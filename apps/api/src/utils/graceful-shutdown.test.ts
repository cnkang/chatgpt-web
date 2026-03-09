/**
 * Tests for graceful shutdown handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupGracefulShutdown } from './graceful-shutdown.js'

describe('graceful shutdown', () => {
  let mockServer: any
  let processExitSpy: any
  let processOnSpy: any
  let setTimeoutSpy: any
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    // Mock server
    mockServer = {
      close: vi.fn(callback => {
        // Simulate successful close
        setTimeout(() => callback(), 10)
      }),
    }

    // Spy on process methods
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    processOnSpy = vi.spyOn(process, 'on')
    setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    vi.restoreAllMocks()
  })

  it('should register SIGTERM and SIGINT handlers', () => {
    cleanup = setupGracefulShutdown(mockServer)

    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
  })

  it('should register uncaughtException handler', () => {
    cleanup = setupGracefulShutdown(mockServer)

    expect(processOnSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
  })

  it('should register unhandledRejection handler', () => {
    cleanup = setupGracefulShutdown(mockServer)

    expect(processOnSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
  })

  it('should close server on SIGTERM', async () => {
    cleanup = setupGracefulShutdown(mockServer)

    // Get the SIGTERM handler
    const sigtermHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGTERM',
    )?.[1] as Function

    expect(sigtermHandler).toBeDefined()

    // Trigger SIGTERM
    sigtermHandler()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockServer.close).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should close server on SIGINT', async () => {
    cleanup = setupGracefulShutdown(mockServer)

    // Get the SIGINT handler
    const sigintHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGINT',
    )?.[1] as Function

    expect(sigintHandler).toBeDefined()

    // Trigger SIGINT
    sigintHandler()

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockServer.close).toHaveBeenCalled()
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it('should exit with code 1 on server close error', async () => {
    const errorServer = {
      close: vi.fn(callback => {
        setTimeout(() => callback(new Error('Close failed')), 10)
      }),
    }

    cleanup = setupGracefulShutdown(errorServer)

    const sigtermHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGTERM',
    )?.[1] as Function

    sigtermHandler()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should set timeout for forced shutdown', () => {
    cleanup = setupGracefulShutdown(mockServer, { timeout: 5000 })

    const sigtermHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGTERM',
    )?.[1] as Function

    sigtermHandler()

    // Check that setTimeout was called with the correct timeout
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
  })

  it('should call onShutdownStart callback', async () => {
    const onShutdownStart = vi.fn()

    cleanup = setupGracefulShutdown(mockServer, { onShutdownStart })

    const sigtermHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGTERM',
    )?.[1] as Function

    sigtermHandler()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onShutdownStart).toHaveBeenCalledWith('SIGTERM')
  })

  it('should call onShutdownComplete callback', async () => {
    const onShutdownComplete = vi.fn()

    cleanup = setupGracefulShutdown(mockServer, { onShutdownComplete })

    const sigtermHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'SIGTERM',
    )?.[1] as Function

    sigtermHandler()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onShutdownComplete).toHaveBeenCalled()
  })

  it('should exit with code 1 on uncaught exception', () => {
    cleanup = setupGracefulShutdown(mockServer)

    const uncaughtHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'uncaughtException',
    )?.[1] as Function

    uncaughtHandler(new Error('Uncaught error'))

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('should exit with code 1 on unhandled rejection', () => {
    cleanup = setupGracefulShutdown(mockServer)

    const unhandledHandler = processOnSpy.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'unhandledRejection',
    )?.[1] as Function

    unhandledHandler('Rejection reason', Promise.resolve())

    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
