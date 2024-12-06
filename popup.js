document.addEventListener("DOMContentLoaded", () => {
  fetchImagesFromPage(); // Automatically fetch images when the popup loads
});

document.getElementById("image").addEventListener("change", handleImage);

document.getElementById("fetchImageBtn").addEventListener("click", fetchImagesFromPage);
document.getElementById("itemForm").addEventListener("submit", handleSubmit);

let imageBase64 = "";
let selectedImageBase64 = "";
let previousSelectedImage = null;

// Handle image upload from user
function handleImage(e) {
  const file = e.target.files[0];
  setFileToBase(file);
  const _url = URL.createObjectURL(file);
  displayImagePreview(_url, file);
}

function setFileToBase(file) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    imageBase64 = reader.result;
  };
}

async function fetchImagesFromPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    chrome.runtime.sendMessage({ type: "FETCH_IMAGES_AND_PROMPT", tabId }, (response) => {
      if (response) {
        const { imageUrls, promptText } = response;

        if (promptText) {
          document.getElementById("prompt").value = promptText;
        } else {
          document.getElementById("prompt").value = "No Promt";
        }

        if (imageUrls.length > 0) {
          displayFetchedImages(imageUrls);
          selectFirstImage(imageUrls[0]);
        }
      }
    });
  });
}

function selectFirstImage(url) {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        selectedImageBase64 = reader.result;
        imageBase64 = selectedImageBase64; // Set this as the image to be saved

        const firstImgElement = document.querySelector(".image-wrapper img");
        if (firstImgElement) {
          firstImgElement.classList.add("selected-image");
          previousSelectedImage = firstImgElement; // Mark the first image as selected
        }
      };
    })
    .catch((error) => console.error("Error fetching image:", error));
}

// Content script to extract all images from the page (runs in the page context)
function getContentFromPage() {
  const images = Array.from(document.querySelectorAll("img")).map((img) => img.src);

  let promptDiv = document.querySelector("h2.prompt");
  if (!promptDiv) {
    promptDiv = document.querySelector("div.prompt");
  }
  // const promptDiv = document.querySelector('.mantine-Text-root.text-sm.mantine-1c2skr8');
  const promptText = promptDiv ? promptDiv.textContent : "";
  return { imageUrls: images, promptText };
}

// Display the fetched images in the popup and allow user to delete
function displayFetchedImages(imageUrls) {
  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = ""; // Clear previous images

  imageUrls.forEach((url) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("image-wrapper");

    const img = document.createElement("img");
    img.src = url;
    img.addEventListener("click", () => selectImage(img, url)); // Select this image on click

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.addEventListener("click", () => wrapper.remove()); // Remove the image on click

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    imageContainer.appendChild(wrapper);
  });
}

// Select the image to save, convert it to Base64, and add bold borders
function selectImage(imgElement, url) {
  // Remove bold border from previously selected image
  if (previousSelectedImage) {
    previousSelectedImage.classList.remove("selected-image");
  }

  // Apply bold border to the currently selected image
  imgElement.classList.add("selected-image");
  previousSelectedImage = imgElement; // Update the selected image

  // Convert the selected image to Base64
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        selectedImageBase64 = reader.result;
        imageBase64 = selectedImageBase64; // Set this as the image to be saved
      };
    })
    .catch((error) => console.error("Error fetching image:", error));
}

// Display preview of uploaded image
function displayImagePreview(url) {
  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = ""; // Clear previous images

  const wrapper = document.createElement("div");
  wrapper.classList.add("image-wrapper");

  const img = document.createElement("img");
  img.src = url;
  wrapper.appendChild(img);

  imageContainer.appendChild(wrapper);
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();

  const prompt = document.getElementById("prompt").value;
  const submitBtn = document.getElementById("submitBtn");
  const successMessageDiv = document.getElementById("successMessage");
  const errorMessageDiv = document.getElementById("errorMessage");

  submitBtn.textContent = "Adding Prompt...";
  submitBtn.disabled = true;

  successMessageDiv.style.display = "none";
  errorMessageDiv.style.display = "none";

  if (prompt && imageBase64) {
    const item = { promt: prompt, image: imageBase64 };

    try {
      const response = await fetch(`${config.API_BASE_URL}/promts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        successMessageDiv.textContent = "Prompt added successfully";
        successMessageDiv.style.display = "block";

        document.getElementById("prompt").value = "";
        document.getElementById("image").value = "";
        imageBase64 = "";
        selectedImageBase64 = "";
        document.getElementById("imageContainer").innerHTML = "";
        previousSelectedImage = null;

        setTimeout(() => {
          successMessageDiv.style.display = "none";
        }, 3000);

        // Close the current tab after successful response
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.remove(tabs[0].id); // This will close the current tab
        });
      } else {
        errorMessageDiv.textContent = "Error adding Prompt";
        errorMessageDiv.style.display = "block";

        setTimeout(() => {
          errorMessageDiv.style.display = "none";
        }, 3000);
      }
    } catch (error) {
      console.error("Error:", error);
      errorMessageDiv.textContent = "Error adding item. Please try again.";
      errorMessageDiv.style.display = "block";

      setTimeout(() => {
        errorMessageDiv.style.display = "none";
      }, 3000);
    } finally {
      submitBtn.textContent = "Add Prompt";
      submitBtn.disabled = false;
    }
  } else {
    errorMessageDiv.textContent = "Please fill out both fields.";
    errorMessageDiv.style.display = "block";

    // Hide the error message after 3 seconds (optional)
    setTimeout(() => {
      errorMessageDiv.style.display = "none";
    }, 3000);

    submitBtn.textContent = "Add Prompt";
    submitBtn.disabled = false;
  }
}
