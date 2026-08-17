import type { Room } from "@/types/room";

export interface RoomRepository {
  getRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | null>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  getLastRoomId(): Promise<string | null>;
  setLastRoomId(id: string | null): Promise<void>;
}

const STORAGE_KEY = "roomly.rooms";
const LAST_ROOM_KEY = "roomly.lastRoomId";

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
    window.localStorage.setItem(LAST_ROOM_KEY, room.id);
  },
  async deleteRoom(id) {
    writeRooms(readRooms().filter((room) => room.id !== id));

    if (window.localStorage.getItem(LAST_ROOM_KEY) === id) {
      const remaining = readRooms();
      if (remaining[0]) {
        window.localStorage.setItem(LAST_ROOM_KEY, remaining[0].id);
      } else {
        window.localStorage.removeItem(LAST_ROOM_KEY);
      }
    }
  },
  async getLastRoomId() {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(LAST_ROOM_KEY);
  },
  async setLastRoomId(id) {
    if (typeof window === "undefined") {
      return;
    }

    if (id) {
      window.localStorage.setItem(LAST_ROOM_KEY, id);
    } else {
      window.localStorage.removeItem(LAST_ROOM_KEY);
    }
  }
};
