export async function readFile(file) {
    return new Promise((resolve) => {
        const fileReader = new FileReader();

        fileReader.onload = () => {
            const { result } = fileReader;
            if (result instanceof ArrayBuffer) {
                resolve(new Uint8Array(result));
            }
        };
        fileReader.readAsArrayBuffer(file);
    });
}

export async function toBlobURL(url, mimeType) {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
}

export function createDownloadLink(data, filename, type, downloadLink) {
    downloadLink.href = URL.createObjectURL(new Blob([data.buffer], { type }));
    downloadLink.download = filename;
    downloadLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${filename}`;
    downloadLink.style.display = 'block';
}

export function createRightLink(data, filename, type, downloadLink) {
    const rightLink = document.createElement('a');
    rightLink.href = URL.createObjectURL(new Blob([data.buffer], { type }));
    rightLink.download = filename;
    rightLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${filename}`;
    rightLink.style.display = 'block';
    rightLink.classList.add('btn', 'btn-success', 'w-100', 'mt-3');
    downloadLink.parentNode.appendChild(rightLink);
}

export function resetState(file, dropzoneClass, messageRef, downloadLink) {
    file = null;
    dropzoneClass = '';
    if (messageRef) messageRef.innerHTML = '';
    if (downloadLink) {
        downloadLink.href = '';
        downloadLink.download = '';
        downloadLink.innerHTML = '';
        downloadLink.style.display = 'none';
        const rightLink = downloadLink.nextSibling;
        if (rightLink) rightLink.remove();
    }
}
