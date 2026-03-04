/**
 * Bitcrusher AudioWorklet Processor
 *
 * Reduces bit depth and sample rate for lo-fi digital degradation.
 * Parameters:
 *   bitDepth     — 1 to 16 (quantization depth)
 *   rateReduction — 1 to 40 (sample-and-hold factor)
 */
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 16, minValue: 1, maxValue: 16 },
      { name: 'rateReduction', defaultValue: 1, minValue: 1, maxValue: 40 },
    ];
  }

  constructor() {
    super();
    this._lastSample = 0;
    this._counter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    const bitDepth = parameters.bitDepth.length > 1 ? parameters.bitDepth : null;
    const rateReduction = parameters.rateReduction.length > 1 ? parameters.rateReduction : null;
    const bitDepthVal = bitDepth ? 0 : parameters.bitDepth[0];
    const rateReductionVal = rateReduction ? 0 : parameters.rateReduction[0];

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; i++) {
        const bd = bitDepth ? bitDepth[i] : bitDepthVal;
        const rr = rateReduction ? rateReduction[i] : rateReductionVal;

        this._counter++;
        if (this._counter >= rr) {
          this._counter = 0;
          // Quantize to bit depth
          const step = Math.pow(0.5, bd);
          this._lastSample = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        outputChannel[i] = this._lastSample;
      }
    }

    return true;
  }
}

registerProcessor('bitcrusher-processor', BitcrusherProcessor);
