import { useState } from 'react';
import { queueService, QueueTicket } from '../services/queue';

export const useQueue = (myCounter: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const performAction = async (action: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      return result;
    } catch (err: any) {
      setError(err);
      console.error('Queue action error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const callNext = async (waitingTickets: QueueTicket[]) => {
    if (waitingTickets.length === 0) {
      throw new Error('Não há senhas em espera.');
    }
    const nextTicket = waitingTickets[0];
    return performAction(() => queueService.callTicket(nextTicket.id, myCounter));
  };

  const callSpecific = async (id: string) => {
    return performAction(() => queueService.callTicket(id, myCounter));
  };

  const complete = async (id: string) => {
    return performAction(() => queueService.completeTicket(id));
  };

  const skip = async (id: string) => {
    return performAction(() => queueService.skipTicket(id));
  };

  const cancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta senha?')) return;
    return performAction(() => queueService.cancelTicket(id));
  };

  const updateDetails = async (id: string, updates: Partial<QueueTicket>) => {
    return performAction(() => queueService.updateTicket(id, updates));
  };

  const generateManual = async (priority: boolean = false) => {
    return performAction(() => queueService.generateTicket(priority));
  };

  return {
    loading,
    error,
    callNext,
    callSpecific,
    complete,
    skip,
    cancel,
    updateDetails,
    generateManual
  };
};
