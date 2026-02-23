// Default field sets for token efficiency
export const DEFAULT_FIELDS = {
  board: "id,name,desc,url,shortUrl,closed",
  list: "id,name,closed,pos",
  card: "id,name,idShort,labels,due,dueComplete,idList,idMembers,shortUrl,closed",
  member: "id,fullName,username",
} as const;

export const DEFAULT_LIMITS = {
  boardActivity: 10,
  cardComments: 10,
  search: 10,
} as const;

// Resolve the fields param: undefined -> smart default, "all" -> undefined (no filter), string -> pass through
export function resolveFields(
  fields: string | undefined,
  entityType: keyof typeof DEFAULT_FIELDS,
): string | undefined {
  if (fields === "all") return undefined;
  if (fields === undefined) return DEFAULT_FIELDS[entityType];
  return fields;
}

export interface TrelloError {
  status: number;
  message: string;
  endpoint: string;
}
