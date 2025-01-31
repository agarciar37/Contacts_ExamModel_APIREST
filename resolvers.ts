import type { Collection } from "mongodb"
import { ContactModel, Contact } from "./types.ts"

export const fromModelToContact = async (
    contactDB : ContactModel,
): Promise<Contact> => {
    return {
        id: contactDB._id!.toString(),
        name: contactDB.name,
        telefono: contactDB.telefono,
        country: contactDB.country,
        timezone: contactDB.timezone,
    }
}