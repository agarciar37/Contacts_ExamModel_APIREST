import type { ObjectId, OptionalId } from "mongodb";

export type ContactModel = OptionalId<{
    name: string;
    telefono: string;
    country: string;
    timezone: string;
}>;

export type Contact = {
    id: string;
    name: string;
    telefono: string;
    country: string;
    timezone: string;
}