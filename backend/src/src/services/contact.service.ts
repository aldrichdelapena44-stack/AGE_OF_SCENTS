export type ContactMessage = {
    id: number;
    name: string;
    email: string;
    message: string;
    createdAt: string;
};

const messages: ContactMessage[] = [];
let nextMessageId = 1;

export function createContactMessage(input: {
    name: string;
    email: string;
    message: string;
}) {
    const contactMessage: ContactMessage = {
        id: nextMessageId++,
        name: input.name,
        email: input.email,
        message: input.message,
        createdAt: new Date().toISOString()
    };

    messages.push(contactMessage);
    return contactMessage;
}

export function getContactMessages() {
    return [...messages].sort((a, b) => b.id - a.id);
}
