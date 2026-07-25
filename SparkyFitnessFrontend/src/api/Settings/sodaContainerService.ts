import { apiCall } from '@/api/api';
import { SodaContainer } from '@/types/settings';

export const getSodaContainers = async (): Promise<SodaContainer[]> => {
  return await apiCall('/soda-containers');
};

export const createSodaContainer = async (
  containerData: Omit<SodaContainer, 'id' | 'user_id'>
): Promise<SodaContainer> => {
  return await apiCall('/soda-containers', {
    method: 'POST',
    body: containerData,
  });
};

export const updateSodaContainer = async (
  id: number,
  containerData: Partial<Omit<SodaContainer, 'id' | 'user_id'>>
): Promise<SodaContainer> => {
  return await apiCall(`/soda-containers/${id}`, {
    method: 'PUT',
    body: containerData,
  });
};

export const deleteSodaContainer = async (id: number): Promise<void> => {
  await apiCall(`/soda-containers/${id}`, {
    method: 'DELETE',
  });
};

export const setPrimarySodaContainer = async (
  id: number
): Promise<SodaContainer> => {
  return await apiCall(`/soda-containers/${id}/set-primary`, {
    method: 'PUT',
  });
};

export const getPrimarySodaContainer =
  async (): Promise<SodaContainer | null> => {
    return await apiCall('/soda-containers/primary');
  };
