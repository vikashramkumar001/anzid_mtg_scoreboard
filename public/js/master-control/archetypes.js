export function initArchetypes(socket) {

    // Archetype list management
    const archetypeList = document.getElementById('archetypeList');
    const addArchetypeForm = document.getElementById('addArchetypeForm');
    const newArchetypeInput = document.getElementById('newArchetypeInput');

    // Function to render the archetype list
    function renderArchetypeList(archetypes) {
        archetypeList.innerHTML = '';
        archetypes.forEach(archetype => {
            const li = document.createElement('li');
            li.className = 'list-group-item archetype-item';

            if (archetype.imageUrl) {
                const img = document.createElement('img');
                const cacheBuster = new Date().getTime();
                img.className = 'archetype-image-preview';
                img.src = archetype.imageUrl + '?v=' + cacheBuster;
                img.alt = archetype.name;
                li.appendChild(img);
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'archetype-name';
            nameSpan.textContent = archetype.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'archetype-actions';

            const uploadLabel = document.createElement('label');
            uploadLabel.className = 'btn btn-secondary btn-sm';
            uploadLabel.textContent = archetype.imageUrl ? 'Change Image' : 'Upload Image';

            const uploadInput = document.createElement('input');
            uploadInput.type = 'file';
            uploadInput.accept = 'image/*';
            uploadInput.style.display = 'none';
            uploadInput.addEventListener('change', (e) => uploadArchetypeImage(archetype.name, e.target.files[0]));

            uploadLabel.appendChild(uploadInput);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteArchetype(archetype.name);

            actionsDiv.appendChild(uploadLabel);
            actionsDiv.appendChild(deleteButton);

            li.appendChild(nameSpan);
            li.appendChild(actionsDiv);

            archetypeList.appendChild(li);
        });
    }

    function uploadArchetypeImage(archetypeName, file) {
        const formData = new FormData();
        formData.append('archetypeName', archetypeName);
        formData.append('image', file);

        fetch('/upload-archetype-image', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Image uploaded successfully');
                    socket.emit('getArchetypeList');
                } else {
                    console.error('Failed to upload image:', data.message);
                    alert('Failed to upload image: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error uploading image:', error);
                alert('Error uploading image. Please try again.');
            });
    }

    // Function to add a new archetype
    function addArchetype(archetypeName) {
        socket.emit('addArchetype', archetypeName);
    }

    // Function to delete a archetype
    function deleteArchetype(archetypeName) {
        socket.emit('deleteArchetype', archetypeName);
    }

    // Function to add new archetypes
    function addArchetypes(archetypeNames) {
        // Filter out any archetype names that already exist in the current list
        const newArchetypeNames = archetypeNames.filter(name => !currentArchetypeList.includes(name));
        if (newArchetypeNames.length > 0) {
            socket.emit('addArchetypes', newArchetypeNames);
        }
    }

    let currentArchetypeList = []; // Keep track of the current archetype list

    // Handle form submission for adding new archetypes
    addArchetypeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newArchetypeInput.value.trim();
        if (input) {
            // Split input by commas or newlines, then trim each entry and filter out empty strings and duplicates
            const archetypeNames = [...new Set(input.split(/[,\n]+/).map(name => name.trim()).filter(name => name !== ''))];
            addArchetypes(archetypeNames);
            newArchetypeInput.value = '';
        }
    });

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        currentArchetypeList = archetypes; // Update the current archetype list
        renderArchetypeList(archetypes);
    });

    // Request initial archetype list when page loads
    socket.emit('getArchetypeList');

    // Function to initialize the archetype list
    function initializeArchetypeList() {
        socket.emit('getArchetypeList');
    }

    // Listen for updated archetype list from server
    socket.on('archetypeListUpdated', (archetypes) => {
        console.log(archetypes)
        currentArchetypeList = archetypes; // Update the current archetype list
        renderArchetypeList(archetypes);
    });

    // Initialize the archetype list when the page loads
    initializeArchetypeList();
}