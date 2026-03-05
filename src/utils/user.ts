import { User, EntityOption } from '../types/task';

export const getUserDisplayName = (user: User, entities: EntityOption[]) => {
  if (!user.entityIds || user.entityIds.length === 0) return user.name;
  const userEntities = entities.filter(e => user.entityIds?.includes(e.id));
  if (userEntities.length === 0) return user.name;
  const entityNames = userEntities.map(e => e.name).join(', ');
  return `${user.name} (${entityNames})`;
};
