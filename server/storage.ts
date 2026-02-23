export interface IStorage {}

class MemoryStorage implements IStorage {}

export const storage = new MemoryStorage();
