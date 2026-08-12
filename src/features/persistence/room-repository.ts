import type { Room } from "@/types/room";

export interface RoomRepository {
  getRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | null>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(id: string): Promise<void>;
}

const STORAGE_KEY = "roomly.rooms";

function readRooms(): Room[] {
  if (typeof window === "undefined") {
    return [];
  }

  const value = window.localStorage.getItem(STORAGE_KEY);

  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as Room[];
  } catch {
    return [];
  }
}

function writeRooms(rooms: Room[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export const localRoomRepository: RoomRepository = {
  async getRooms() {
    return readRooms();
  },
  async getRoom(id) {
    return readRooms().find((room) => room.id === id) ?? null;
  },
  async saveRoom(room) {
    const rooms = readRooms();
    const nextRooms = [
      room,
      ...rooms.filter((existingRoom) => existingRoom.id !== room.id)
    ];

    writeRooms(nextRooms);
  },
  async deleteRoom(id) {
    writeRooms(readRooms().filter((room) => room.id !== id));
  }
};
