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

export const createDownloadLink = (data, filename, type, linkElement) => {
    const blob = new Blob([data.buffer], { type });
    const url = URL.createObjectURL(blob);
    linkElement.href = url;
    linkElement.download = filename;
    linkElement.style.display = 'block';
    linkElement.innerHTML = `Download ${filename}`;
};

export const createRightLink = (data, filename, type, linkElement) => {
    const blob = new Blob([data.buffer], { type });
    const url = URL.createObjectURL(blob);
    const rightLink = document.createElement('a');
    rightLink.href = url;
    rightLink.download = filename;
    rightLink.style.display = 'block';
    rightLink.innerHTML = `Download ${filename}`;
    linkElement.parentNode.appendChild(rightLink);
};

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
