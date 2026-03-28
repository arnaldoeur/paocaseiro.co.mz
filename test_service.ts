import { queueService } from './services/queue';

async function test() {
    console.log("Testing queueService...");
    try {
        const tickets = await queueService.getTicketsToday();
        console.log("Successfully fetched today's tickets:", tickets.length);
        
        const next = await queueService.callNext("Teste");
        console.log("CallNext result:", next);
        
        console.log("All systems GO.");
    } catch (err) {
        console.error("SERVICE TEST FAILED:", err);
    }
}

test();
