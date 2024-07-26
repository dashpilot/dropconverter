<script>
    import { onMount } from 'svelte';
    import { FFmpeg } from '@ffmpeg/ffmpeg';
    import { writable } from 'svelte/store';
  
    let loaded = writable(false);
    let ffmpeg;
    let file;
    let conversionType = 'convert-to-wav';
    let messageRef;
    let downloadLink;
    let dropzoneClass = '';
    let fileInput;
    let isLoading = false;
  
    onMount(() => {
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        load();
      }
    });
  
    const load = async () => {
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        ffmpeg.on('log', ({ message }) => {
          messageRef.innerHTML = message;
          console.log(message);
        });
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        await ffmpeg.load({ coreURL, wasmURL });
        loaded.set(true);
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        messageRef.innerHTML = 'Error loading FFmpeg. Check console for details.';
      }
    };
  
    const handleFileChange = (event) => {
      resetState();
      file = event.target.files[0];
      dropzoneClass = 'file-dropped';
    };
  
    const handleDrop = (event) => {
      event.preventDefault();
      resetState();
      file = event.dataTransfer.files[0];
      dropzoneClass = 'file-dropped';
    };
  
    const handleDragOver = (event) => {
      event.preventDefault();
      dropzoneClass = 'dragover';
    };
  
    const handleDragLeave = () => {
      dropzoneClass = '';
    };
  
    const handleClick = () => {
      fileInput.click();
    };
  
    const transcode = async () => {
      if (!file) {
        messageRef.innerHTML = 'Please upload a file first.';
        return;
      }
  
      isLoading = true;
  
      // Artificial delay to make the spinner spin slightly longer
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  
      try {
        const fileData = await readFile(file);
        await ffmpeg.writeFile('input.wav', fileData);
  
        let outputFilename;
        if (conversionType === 'stereo-to-mono') {
          // Convert all files to 24-bit and split into left and right channels
          await ffmpeg.exec(['-i', 'input.wav', '-c:a', 'pcm_s24le', 'converted.wav']);
          await ffmpeg.exec(['-i', 'converted.wav', '-map_channel', '0.0.0', 'left.wav', '-map_channel', '0.0.1', 'right.wav']);
  
          const leftData = await ffmpeg.readFile('left.wav');
          const rightData = await ffmpeg.readFile('right.wav');
  
          const originalFilename = file.name.split('.').slice(0, -1).join('.');
          const leftFilename = `${originalFilename}-left.wav`;
          const rightFilename = `${originalFilename}-right.wav`;
  
          downloadLink.href = URL.createObjectURL(new Blob([leftData.buffer], { type: 'audio/wav' }));
          downloadLink.download = leftFilename;
          downloadLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${leftFilename}`;
          downloadLink.style.display = 'block';
  
          const rightLink = document.createElement('a');
          
          rightLink.href = URL.createObjectURL(new Blob([rightData.buffer], { type: 'audio/wav' }));
          rightLink.download = rightFilename;
          rightLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${rightFilename}`;
          rightLink.style.display = 'block';
          rightLink.classList.add('btn', 'btn-success', 'w-100', 'mt-3');
          downloadLink.parentNode.appendChild(rightLink);
        } else if (conversionType === 'convert-to-wav') {
          await ffmpeg.exec(['-i', 'input.wav', 'output.wav']);
          const outputData = await ffmpeg.readFile('output.wav');
          outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.wav`;
  
          downloadLink.href = URL.createObjectURL(new Blob([outputData.buffer], { type: 'audio/wav' }));
          downloadLink.download = outputFilename;
          downloadLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${outputFilename}`;
          downloadLink.style.display = 'block';
        } else if (conversionType === 'convert-to-mp3') {
          await ffmpeg.exec(['-i', 'input.wav', 'output.mp3']);
          const outputData = await ffmpeg.readFile('output.mp3');
          outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.mp3`;
  
          downloadLink.href = URL.createObjectURL(new Blob([outputData.buffer], { type: 'audio/mp3' }));
          downloadLink.download = outputFilename;
          downloadLink.innerHTML = `<i class="fa-solid fa-download"></i> &nbsp;Download ${outputFilename}`;
          downloadLink.style.display = 'block';
        }
      } catch (error) {
        console.error('Error during transcoding:', error);
        messageRef.innerHTML = 'Error during transcoding. Check console for details.';
      } finally {
        isLoading = false;
      }
    };
  
    const resetState = () => {
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
    };
  
    async function readFile(file) {
      return new Promise(resolve => {
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
  
    async function toBlobURL(url, mimeType) {
      const response = await fetch(url);
      const blob = await response.blob();
      return URL.createObjectURL(new Blob([blob], { type: mimeType }));
    }
  </script>

  
  <a href="/" class="logo dashed" style="background-image: url(/img/tapedeck.png);"></a>
  
  <div class="micro-container">
<div class="text-center">
<h4 class="mt-0 mb-4">Audio Converter</h4>
</div>

    {#if $loaded}
      <div>
        <div class="dropzone {dropzoneClass}" on:drop={handleDrop} on:dragover={handleDragOver} on:dragleave={handleDragLeave} on:click={handleClick}>
          Drop your audio file here or click to upload
          <input type="file" accept="audio/*" on:change={handleFileChange} bind:this={fileInput} class="hidden" />
        </div>
        <br/>
        <select bind:value={conversionType} class="form-select">
          <option value="convert-to-wav">Convert to WAV</option>
          <option value="convert-to-mp3">Convert to MP3</option>
          <option value="stereo-to-mono">Stereo to Dual Mono</option>
          <!-- Add more conversion options here -->
        </select><br/>
        <button on:click={transcode} class="btn btn-dark w-100" disabled={!file}>
            {#if isLoading}
                <i class="fas fa-spinner fa-spin"></i>
            {:else}
                Convert
            {/if}
        </button>
        <p bind:this={messageRef} class="hidden"></p>
        <a bind:this={downloadLink} class="btn btn-success w-100 mt-3" style="display: none;"></a>
      </div>
    {:else}
      <p class="text-center mt-3">Loading...</p>
    {/if}
  </div>