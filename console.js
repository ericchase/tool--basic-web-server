const restartDiv = document.getElementById('restart');

restartDiv.addEventListener('click', () => {
    callServerApi('/api/restart', 'Restarting...')
    refresh(500);
});

const shutdownDiv = document.getElementById('shutdown');

shutdownDiv.addEventListener('click', () => {
    callServerApi('/api/shutdown', 'Shutting down...');
    const refreshButton = document.createElement('button');
    refreshButton.innerText = 'Refresh';
    refreshButton.addEventListener('click', () => refresh(0));
    document.body.querySelector('div').append();
});

function callServerApi(api, message) {
    fetch(api);
    document.getElementById('status').innerText = message;
    restartDiv.remove();
    shutdownDiv.remove();
}

function refresh(ms) {
    setTimeout("location.reload(true);", ms);
}
