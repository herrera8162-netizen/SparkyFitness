import { sodaContainerKeys } from '@/api/keys/settings';
import {
  getSodaContainers,
  getPrimarySodaContainer,
  createSodaContainer,
  updateSodaContainer,
  deleteSodaContainer,
  setPrimarySodaContainer,
} from '@/api/Settings/sodaContainerService';
import { SodaContainer } from '@/types/settings';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

export const useSodaContainersQuery = (userId?: string) => {
  return useQuery({
    queryKey: sodaContainerKeys.lists(),
    queryFn: getSodaContainers,
    meta: {
      errorMessage: 'Failed to fetch soda containers.',
    },
    enabled: !!userId,
  });
};

export const primarySodaContainerOptions = () => ({
  queryKey: sodaContainerKeys.primary(),
  queryFn: getPrimarySodaContainer,
});

export const useCreateSodaContainerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSodaContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sodaContainerKeys.all });
    },
    meta: {
      successMessage: 'Soda container added.',
      errorMessage: 'Failed to add soda container.',
    },
  });
};

export const useUpdateSodaContainerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Omit<SodaContainer, 'id' | 'user_id'>>;
    }) => updateSodaContainer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sodaContainerKeys.all });
    },
    meta: {
      successMessage: 'Soda container updated.',
      errorMessage: 'Failed to update soda container.',
    },
  });
};

export const useDeleteSodaContainerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSodaContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sodaContainerKeys.all });
    },
    meta: {
      successMessage: 'Soda container deleted.',
      errorMessage: 'Failed to delete soda container.',
    },
  });
};

export const useSetPrimarySodaContainerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setPrimarySodaContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sodaContainerKeys.all });
    },
    meta: {
      successMessage: 'Primary container updated.',
      errorMessage: 'Failed to set primary container.',
    },
  });
};
