import type React from 'react';
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
  useMemo,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { useActiveUser } from './ActiveUserContext';
import {
  useSodaContainersQuery,
  useSetPrimarySodaContainerMutation,
} from '@/hooks/Settings/useSodaContainers';
import { SodaContainer } from '@/types/settings';

interface SodaContainerContextType {
  activeContainer: SodaContainer | undefined | null;
  containers: SodaContainer[];
}

const SodaContainerContext = createContext<
  SodaContainerContextType | undefined
>(undefined);

export const SodaContainerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const { activeUserId } = useActiveUser(); // Get activeUserId

  const currentUserId = activeUserId || user?.id;
  const { data: containers = [], isSuccess } =
    useSodaContainersQuery(currentUserId);
  const { mutate: setPrimary } = useSetPrimarySodaContainerMutation();

  // container exists but no container is primary
  useEffect(() => {
    if (isSuccess && containers.length > 0) {
      const hasPrimary = containers.some((c) => c.is_primary);
      if (!hasPrimary) {
        const firstContainer = containers[0];
        if (firstContainer) {
          setPrimary(firstContainer.id);
        }
      }
    }
  }, [containers, isSuccess, setPrimary]);

  const activeContainer = useMemo(() => {
    if (loading || !currentUserId || !isSuccess) return null;

    const primary = containers.find((c) => c.is_primary);
    if (primary) return primary;

    // Fallback when no containers exist in the database yet.
    if (containers.length === 0) {
      return {
        id: -1, // Avoids type errors, since id is usually number
        user_id: '',
        name: 'Default Container',
        volume: 355,
        unit: 'ml',
        is_primary: true,
        servings_per_container: 1,
      } as SodaContainer;
    }

    return containers[0];
  }, [containers, currentUserId, isSuccess, loading]);

  return (
    <SodaContainerContext.Provider value={{ activeContainer, containers }}>
      {children}
    </SodaContainerContext.Provider>
  );
};

export const useSodaContainer = () => {
  const context = useContext(SodaContainerContext);
  if (context === undefined) {
    throw new Error(
      'useSodaContainer must be used within a SodaContainerProvider'
    );
  }
  return context;
};
