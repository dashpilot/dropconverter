<script>
    import { onMount } from 'svelte';
    import { FFmpeg } from '@ffmpeg/ffmpeg';
    import { readFile, toBlobURL, createDownloadLink, createRightLink, resetState } from '$lib/helpers.js';
  
    let loaded = false;
    let ffmpeg;
    let file;
    let conversionType = 'convert-to-wav';
    let resolution = 'current';
    let quality = 'best';
    let messageRef;
    let downloadLink;
    let dropzoneClass = '';
    let fileInput;
    let isLoading = false;
    let progress_perc = 0;
    let error = '';
    let last_error = '';
    let conversionOptions = [];
    let resolutionOptions = [
      { value: 'current', label: 'Current Resolution' },
      { value: '1080p', label: '1080P' },
      { value: '720p', label: '720P' }
    ];
    let qualityOptions = [
      { value: 'best', label: 'Best Quality' },
      { value: 'smaller', label: 'Smaller Filesize' }
    ];
    let isVideo = false;
  
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
        ffmpeg.on("progress", ({ progress, time }) => {
          console.log((progress * 100) + "%, time: " + (time / 1000000) + " s");
          progress_perc = progress * 100;
        });
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        await ffmpeg.load({ coreURL, wasmURL });
        loaded = true;
      } catch (error) {
        console.error('Error loading FFmpeg:', error);
        messageRef.innerHTML = 'Error loading FFmpeg. Check console for details.';
      }
    };
  
    const handleFileChange = (event) => {
      resetState(file, dropzoneClass, messageRef, downloadLink);
      file = event.target.files[0];
      dropzoneClass = 'file-dropped';
      updateConversionOptions(file.type);
      hideDownloadAndProgress();
    };
  
    const handleDrop = (event) => {
      event.preventDefault();
      resetState(file, dropzoneClass, messageRef, downloadLink);
      file = event.dataTransfer.files[0];
      dropzoneClass = 'file-dropped';
      updateConversionOptions(file.type);
      hideDownloadAndProgress();
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
  
    const updateConversionOptions = (fileType) => {
      if (fileType.startsWith('audio/')) {
        isVideo = false;
        conversionOptions = [
          { value: 'convert-to-wav', label: 'Convert to WAV' },
          { value: 'convert-to-mp3', label: 'Convert to MP3' },
          { value: 'convert-to-aac', label: 'Convert to AAC' },
          { value: 'convert-to-flac', label: 'Convert to FLAC' },
          { value: 'convert-to-ogg', label: 'Convert to OGG' },
          { value: 'convert-to-m4a', label: 'Convert to M4A' },
          { value: 'stereo-to-mono', label: 'Stereo to Dual Mono' }
        ];
        conversionType = 'convert-to-wav';
      } else if (fileType.startsWith('video/')) {
        isVideo = true;
        conversionOptions = [
          { value: 'convert-to-mp4', label: 'Convert to MP4' },
          { value: 'convert-to-mov', label: 'Convert to MOV' },
          { value: 'convert-to-webm', label: 'Convert to WEBM' },
          { value: 'convert-to-mkv', label: 'Convert to MKV' },
          { value: 'convert-to-gif', label: 'Convert to Animated GIF' }
        ];
        conversionType = 'convert-to-mp4';
      }
    };
  
    const hideDownloadAndProgress = () => {
      downloadLink.style.display = 'none';
      downloadLink.innerHTML = '';
      progress_perc = 0;
      error = '';
    };
  
    const transcode = async () => {
      if (!file) {
        messageRef.innerHTML = 'Please upload a file first.';
        return;
      }
  
      isLoading = true;
      hideDownloadAndProgress();
      progress_perc = 0;
  
      // Artificial delay to make the spinner spin slightly longer
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  
      try {
        const fileData = await readFile(file);
        await ffmpeg.writeFile('input', fileData);
  
        if (conversionType === 'stereo-to-mono') {
          await convertStereoToMono();
        } else {
          await convertFile(conversionType, resolution, quality);
        }
      } catch (err) {
        console.error('Error during transcoding:', err);
        if (err.message === 'called FFmpeg.terminate()') {
          last_error = false;
        } else {
          last_error = err.message;
          error = `Error during conversion: ${last_error}`;
        }
      } finally {
        isLoading = false;
        progress_perc = 0; // Reset progress bar
        // Do not call hideDownloadAndProgress here to keep the download link visible
      }
    };
  
    const cancelTranscode = async () => {
      if (ffmpeg) {
        try {
          await ffmpeg.terminate();
        } catch (err) {
          // Suppress the warning message
          if (err.message !== 'Error: called FFmpeg.terminate()') {
            console.error('Error during termination:', err);
          }
        }
        isLoading = false;
        progress_perc = 0;
        hideDownloadAndProgress();
        await load(); // Reload ffmpeg after termination
      }
    };
  
    const convertStereoToMono = async () => {
      await ffmpeg.exec(['-i', 'input', '-c:a', 'pcm_s24le', 'converted.wav']);
      await ffmpeg.exec(['-i', 'converted.wav', '-map_channel', '0.0.0', 'left.wav', '-map_channel', '0.0.1', 'right.wav']);
  
      const leftData = await ffmpeg.readFile('left.wav');
      const rightData = await ffmpeg.readFile('right.wav');
  
      const originalFilename = file.name.split('.').slice(0, -1).join('.');
      const leftFilename = `${originalFilename}-left.wav`;
      const rightFilename = `${originalFilename}-right.wav`;
  
      createDownloadLink(leftData, leftFilename, 'audio/wav', downloadLink);
      createRightLink(rightData, rightFilename, 'audio/wav', downloadLink);
    };
  
    const convertFile = async (type, resolution, quality) => {
      let outputFilename;
      let outputType;
      let resolutionOption = [];
      let qualityOption = [];
  
      if (resolution === '1080p') {
        resolutionOption = ['-vf', 'scale=1920:1080'];
      } else if (resolution === '720p') {
        resolutionOption = ['-vf', 'scale=1280:720'];
      }
  
      if (quality === 'best') {
        qualityOption = ['-q:v', '2'];
      } else if (quality === 'smaller') {
        qualityOption = ['-b:v', '1M'];
      }
  
      if (type === 'convert-to-wav') {
        await ffmpeg.exec(['-i', 'input', 'output.wav']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.wav`;
        outputType = 'audio/wav';
      } else if (type === 'convert-to-mp3') {
        await ffmpeg.exec(['-i', 'input', 'output.mp3']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.mp3`;
        outputType = 'audio/mp3';
      } else if (type === 'convert-to-aac') {
        await ffmpeg.exec(['-i', 'input', 'output.aac']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.aac`;
        outputType = 'audio/aac';
      } else if (type === 'convert-to-flac') {
        await ffmpeg.exec(['-i', 'input', 'output.flac']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.flac`;
        outputType = 'audio/flac';
      } else if (type === 'convert-to-ogg') {
        await ffmpeg.exec(['-i', 'input', 'output.ogg']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.ogg`;
        outputType = 'audio/ogg';
      } else if (type === 'convert-to-m4a') {
        await ffmpeg.exec(['-i', 'input', 'output.m4a']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.m4a`;
        outputType = 'audio/m4a';
      } else if (type === 'convert-to-mp4') {
        await ffmpeg.exec(['-i', 'input', ...resolutionOption, ...qualityOption, 'output.mp4']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.mp4`;
        outputType = 'video/mp4';
      } else if (type === 'convert-to-mov') {
        await ffmpeg.exec(['-i', 'input', ...resolutionOption, ...qualityOption, 'output.mov']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.mov`;
        outputType = 'video/quicktime';
      } else if (type === 'convert-to-webm') {
        await ffmpeg.exec(['-i', 'input', ...resolutionOption, ...qualityOption, 'output.webm']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.webm`;
        outputType = 'video/webm';
      } else if (type === 'convert-to-mkv') {
        await ffmpeg.exec(['-i', 'input', ...resolutionOption, ...qualityOption, 'output.mkv']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.mkv`;
        outputType = 'video/x-matroska';
      } else if (type === 'convert-to-gif') {
        await ffmpeg.exec(['-i', 'input', ...resolutionOption, 'output.gif']);
        outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.gif`;
        outputType = 'image/gif';
      }
  
      const outputData = await ffmpeg.readFile(`output.${type.split('-').pop()}`);
      createDownloadLink(outputData, outputFilename, outputType, downloadLink);
    };
  </script>
  
  <a href="/" class="logo dashed" style="background-image: url(/img/tapedeck.png);"></a>
  
  <div class="micro-container">
    <div class="text-center">
      <h4 class="mt-0 mb-0">DropConverter</h4>
      <p class="text-muted pt-1 pb-3">Easily convert audio and video files for free</p>
    </div>
  
    <div>
      <div class="dropzone {dropzoneClass}" on:drop={handleDrop} on:dragover={handleDragOver} on:dragleave={handleDragLeave} on:click={handleClick}>
        Drop your audio or video file here<br />or click to upload
        <input type="file" accept="audio/*, video/*" on:change={handleFileChange} bind:this={fileInput} class="hidden" />
      </div>
  
      {#if file}
        <br/>
        <select bind:value={conversionType} class="form-select mb-3" on:change={hideDownloadAndProgress}>
          {#each conversionOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
  
        {#if isVideo}
          <select bind:value={resolution} class="form-select mb-3" on:change={hideDownloadAndProgress}>
            {#each resolutionOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
  
          {#if conversionType !== 'convert-to-gif'}
            <select bind:value={quality} class="form-select mb-3" on:change={hideDownloadAndProgress}>
              {#each qualityOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          {/if}
        {/if}
  
        <button on:click={transcode} class="btn btn-dark w-100" disabled={!file}>
          {#if isLoading}
            <i class="fas fa-spinner fa-spin"></i>
          {:else}
            Convert
          {/if}
        </button>
  
        {#if progress_perc > 0}
          <div class="progress mt-2">
            <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: {progress_perc}%;"></div>
          </div>
          <button on:click={cancelTranscode} class="btn btn-outline-danger w-100 mt-2">Cancel</button>
        {/if}
      {/if}
  
      {#if error}
        <div class="alert alert-danger mt-2">{error}</div>
      {/if}
  
      <p bind:this={messageRef} class="hidden"></p>
      <a bind:this={downloadLink} class="btn btn-success w-100 mt-3" style="display: none;"></a>
    </div>
  </div>
  
  {#if loaded}
    <p class="text-center mt-2">Drop what you're doing!</p>
  {:else}
    <p class="text-center mt-2">Loading...</p>
  {/if}