function refresh(ms) {
    setTimeout("location.reload(true);", ms);
}


const restartDiv = document.getElementById('restart');

restartDiv.addEventListener('click', () => {
    fetch('/api/restart');
    document.getElementById('status').innerText = 'Restarting...';
    restartDiv.remove();
    shutdownDiv.remove();
    refresh(500);
});


const shutdownDiv = document.getElementById('shutdown');

shutdownDiv.addEventListener('click', () => {
    fetch('/api/shutdown');
    document.getElementById('status').innerText = 'Shutting down...';
    restartDiv.remove();
    shutdownDiv.remove();

    const refreshButton = document.createElement('button');
    refreshButton.innerText = 'Refresh';
    refreshButton.addEventListener('click', () => refresh(0));
    document.body.querySelector('div').append();
});


const fileListDiv = document.getElementById('file-list');

fetch('/api/list')
    .then(response => response.json())
    .then(json => {
        json.forEach(path => {
            const resourceDiv = document.createElement('div');
            resourceDiv.innerHTML = `<a href="${path}">${path}</a>`;
            fileListDiv.appendChild(resourceDiv);
        });
    });