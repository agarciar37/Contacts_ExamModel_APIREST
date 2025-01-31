import { MongoClient, ObjectId } from "mongodb";
import { Contact, ContactModel } from "./types.ts";
import { fromModelToContact } from "./resolvers.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");
const API_KEY = Deno.env.get("API_KEY");

if (!MONGO_URL) {
    throw new Error("Please provide a MONGO_URL");
    Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("contacts_APIREST");
const contactsCollection = db.collection<ContactModel>("contacts");

const handler = async (req: Request): Promise<Response> => {
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    if (method === "POST" && path === "/contacts") {
        // para añadir un contacto se deberá añadir el nombre y el teléfono (incluyendo el prefijo nacional)
        // Se debe comprobar que el número de teléfono es correcto (a través del uso de una API).
        // A través de la API se obtendrá el país y la zona horaria del contacto y se almacenará en la base de datos.
        // API_PHONE: https://api.api-ninjas.com/v1/validatephone?number=+12065550100
        // Con la api anterior se puede comprobar si el número de teléfono es correcto y obtener el país y la zona horaria.
        // https://api.api-ninjas.com/v1/worldtime?city=london
        const contact = await req.json();
        if (!contact.name || !contact.telefono) {
            return new Response("Name and telefono are required", { status: 400 });
        }

        const API_KEY = Deno.env.get("API_KEY");
        if (!API_KEY) {
            return new Response("API_KEY is required", { status: 500 });
        }

        const contactAvailable = await contactsCollection.findOne({ telefono: contact.telefono });
        if (contactAvailable) {
            return new Response("Contact already exists", { status: 400 });
        }

        const phoneAPI = `https://api.api-ninjas.com/v1/validatephone?number=${contact.telefono}`;
        const phoneResponse = await fetch(phoneAPI, {
            headers: {
                "X-Api-Key": API_KEY
            }
        });

        if (!phoneResponse.ok) {
            return new Response("Phone number is not valid", { status: 400 });
        }

        const phoneData = await phoneResponse.json();
        
        const country = phoneData.country;
        const timezone = phoneData.timezones;

        const { insertedId } = await contactsCollection.insertOne({
            name: contact.name,
            telefono: contact.telefono,
            country,
            timezone
        });

        return new Response(
            JSON.stringify({
                name: contact.name,
                telefono: contact.telefono,
                country,
                timezone,
                id: insertedId,
            }),
            { status: 201 }
        )
    } else if (method === "GET"){
        if (path === "/contacts") {
            const contacts = await contactsCollection.find().toArray();
            return new Response(JSON.stringify(contacts), { status: 200 });
        } else if (path === "/contact") {
            const id = url.searchParams.get("id");
            if (!id) {
                return new Response("Id is required", { status: 400 });
            }
            const contactDB = await contactsCollection.findOne({ _id: new ObjectId(id) });
            if (!contactDB) {
                return new Response("Contact not found", { status: 404 });
            }
            const contact = await fromModelToContact(contactDB);
            return new Response(JSON.stringify(contact))
        }
    } else if (method === "PUT" && path === "/contact") {
        const id = url.searchParams.get("id");
        if (!id) {
            return new Response("Id is required", { status: 400 });
        }
        const contactDB = await contactsCollection.findOne({ _id: new ObjectId(id) });
        if (!contactDB) {
            return new Response("Contact not found", { status: 404 });
        }

        const contact = await req.json();
        if (!contact.name || !contact.telefono) {
            return new Response("Name and telefono are required", { status: 400 });
        }

        const phoneAPI = `https://api.api-ninjas.com/v1/validatephone?number=${contact.telefono}`;
        const phoneResponse = await fetch(phoneAPI, {
            headers: {
                "X-Api-Key": API_KEY
            }
        });

        if (!phoneResponse.ok) {
            return new Response("Phone number is not valid", { status: 400 });
        }

        const phoneData = await phoneResponse.json();
        
        const country = phoneData.country;
        const timezone = phoneData.timezones;

        await contactsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { name: contact.name, telefono: contact.telefono, country, timezone } }
        );

        return new Response("Contact updated", { status: 200 });
    } else if (method === "DELETE" && path === "/contact") {
        const id = url.searchParams.get("id");
        if (!id) {
            return new Response("Id is required", { status: 400 });
        }
        const contactDB = await contactsCollection.findOne({ _id: new ObjectId(id) });
        if (!contactDB) {
            return new Response("Contact not found", { status: 404 });
        }
        await contactsCollection.deleteOne({ _id: new ObjectId(id) });
        return new Response("Contact deleted", { status: 200 });
    }
    return new Response ("Endpoint not found", { status: 404 });
}

Deno.serve({port: 3000}, handler)