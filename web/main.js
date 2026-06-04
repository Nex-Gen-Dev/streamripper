async function runBatch() {
    const input = document.getElementById('linksInput').value;
    const links = input.split('\n').filter(line => line.trim() !== '');
    
    if(links.length === 0) {
        document.getElementById('status').innerText = "❌ Please insert at least one link.";
        return;
    }
    
    document.getElementById('status').innerText = "📥 Downloading... Check your System Music folder!";
    document.getElementById('btn').disabled = true;
    
    // Calls the Python backend logic asynchronously
    let result = await eel.download_queue_from_ui(links)();
    
    document.getElementById('status').innerText = result;
    document.getElementById('btn').disabled = false;
}
