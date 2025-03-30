export function initOverlayUpload(socket) {

    const currentHeaderImage = document.getElementById('currentHeaderImage');
    const preview = document.getElementById('imagePreview'); // Get the preview element
    const previewContainer = document.getElementById('uploadImagePreview'); // Get the preview element
    const successMessage = document.getElementById('successMessage');
    const cancelButton = document.getElementById('cancelButton');
    const overlayHeaderImage = document.getElementById('overlayImage');

    // Handle the form submission via JavaScript (AJAX)
    const form = document.getElementById('uploadForm');
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the form from submitting the traditional way

        // Create a FormData object to hold the file input data
        const formData = new FormData();
        formData.append('overlay_header', overlayHeaderImage.files[0]);

        // Submit the form via fetch (AJAX)
        fetch('/upload-header-overlay', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Image uploaded successfully!');
                    successMessage.textContent = 'Image uploaded successfully';
                    successMessage.style.display = 'block'; // Display the success message

                    // Update the currently set image
                    const cacheBuster = new Date().getTime(); // Get the current timestamp
                    currentHeaderImage.src = data.newImageUrl + '?v=' + cacheBuster; // Set the src to the new image URL
                    currentHeaderImage.style.display = 'block'; // Display the image

                    // stop showing preview container
                    previewContainer.style.display = 'none';

                    // stop showing cancel button
                    cancelButton.style.display = 'none';

                    // Clear the file input
                    overlayImage.value = '';
                } else {
                    console.error('Upload failed');
                }
            })
            .catch(error => {
                console.error('Error uploading image:', error);
            });
    });

    // Image preview functionality
    overlayHeaderImage.addEventListener('change', function (event) {
        const file = event.target.files[0]; // Get the selected file
        const reader = new FileReader();

        if (file) {
            reader.readAsDataURL(file); // Read the file as a data URL (base64)

            reader.onload = function (e) {
                // show cancel button
                cancelButton.style.display = 'inline';
                // remove message if exists
                successMessage.style.display = 'none';
                // Set the src of the preview image
                preview.src = e.target.result;
                // Display the preview image
                previewContainer.style.display = 'block';
            };
        }
    });

    // Cancel upload functionality
    cancelButton.addEventListener('click', function () {
        // Clear the file input
        overlayImage.value = '';
        // Hide the preview image and cancel button
        previewContainer.style.display = 'none';
        cancelButton.style.display = 'none';
    });

    // Listen for background image update
    socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
        console.log('Overlay header background image:', newImageUrl);

        // Update the currently set image
        currentHeaderImage.src = newImageUrl; // Set the src to the new image URL
        currentHeaderImage.style.display = 'block'; // Display the image
    });

    // Listen for background image update
    socket.on('overlayHeaderBackgroundUpdate', (newImageUrl) => {
        console.log('Overlay header background image:', newImageUrl);

        // Update the currently set image
        currentHeaderImage.src = newImageUrl; // Set the src to the new image URL
        currentHeaderImage.style.display = 'block'; // Display the image
    });

    const currentFooterImage = document.getElementById('currentFooterImage');
    const footerPreview = document.getElementById('footerImagePreview');
    const footerPreviewContainer = document.getElementById('uploadFooterImagePreview');
    const footerSuccessMessage = document.getElementById('footerSuccessMessage');
    const cancelFooterButton = document.getElementById('cancelFooterButton');
    const overlayFooterImage = document.getElementById('overlayFooterImage');

    // Handle the footer form submission
    const footerForm = document.getElementById('uploadFooterForm');
    footerForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData();
        formData.append('overlay_footer', overlayFooterImage.files[0]);

        fetch('/upload-footer-overlay', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Footer image uploaded successfully!');
                    footerSuccessMessage.textContent = 'Footer image uploaded successfully';
                    footerSuccessMessage.style.display = 'block';

                    const cacheBuster = new Date().getTime();
                    currentFooterImage.src = data.newImageUrl + '?v=' + cacheBuster;
                    currentFooterImage.style.display = 'block';

                    footerPreviewContainer.style.display = 'none';
                    cancelFooterButton.style.display = 'none';
                    overlayFooterImage.value = '';
                } else {
                    console.error('Footer upload failed');
                }
            })
            .catch(error => {
                console.error('Error uploading footer image:', error);
            });
    });

    // Footer image preview functionality
    overlayFooterImage.addEventListener('change', function (event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        if (file) {
            reader.readAsDataURL(file);

            reader.onload = function (e) {
                cancelFooterButton.style.display = 'inline';
                footerSuccessMessage.style.display = 'none';
                footerPreview.src = e.target.result;
                footerPreviewContainer.style.display = 'block';
            };
        }
    });

    // Cancel footer upload functionality
    cancelFooterButton.addEventListener('click', function () {
        overlayFooterImage.value = '';
        footerPreviewContainer.style.display = 'none';
        cancelFooterButton.style.display = 'none';
    });

    // Listen for footer background image update
    socket.on('overlayFooterBackgroundUpdate', (newImageUrl) => {
        console.log('Overlay footer background image:', newImageUrl);
        currentFooterImage.src = newImageUrl;
        currentFooterImage.style.display = 'block';
    });

}
