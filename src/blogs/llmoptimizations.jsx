import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaDatabase } from 'react-icons/fa6';

const markdown = `
## Packed Tensors
To simplify the implementation of the attention mechanism, one can use padded tensors, in which all sequences are padded to the same length. TensorRT-LLM library uses packed tensors, in which there is no padding. However, the user needs to provide the lengths of the sequences. This allows for better memory utilization and faster computation, as the model can process the sequences in parallel without the overhead of padding.

## Multi Block Mode for Attention
The masked multi-head attention kernel in the TensorRT-LLM library has a special mode called multi-block mode. Typically, each attention head executes independently on a single CUDA thread block. However, in multi-block mode, the work can be distribited across multiple thread blocks, depending on GPU occupnacy. This mode is particularly useful for scenarios where the number of heads and the batch size is relatively small. It is worth testing that mode when batch_size * num_heads is less than the number of multi-processors on the GPU.

## In Flight Batching 

## Chunked Context 

## Paged KV Cache

## Quantized KV Cache

## Sliding Window Attention

## Flash Attention


`;

export default class TransIsol extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Large Language Model Runtime Optimizations | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div>
                <div className="row bhead">
                    <FaDatabase className="bigger gt1" />
                </div>
                <h1 className="title">Large Language Model Runtime Optimizations</h1>
                <p>Pranshu Gupta, Nov 30, 2024</p>
                <Sharer className="sharer" link={window.location.href} title={"Large Language Model Runtime Optimizations"}></Sharer>
                <p className="introduction">
                    Large Language Models (LLMs) are a class of deep learning models that have gained significant attention in recent years due to their ability to generate human-like text. However, the computational resources required to train and deploy these models can be substantial. In this article, we will explore some of the runtime optimizations that can be applied to LLMs to improve their performance and reduce their resource consumption.<br></br>
                    <br></br>
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <ReactMarkdown remarkPlugins={[remarkGfm]} children={markdown}></ReactMarkdown>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">References</h3>
                <ol>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://github.com/NVIDIA/TensorRT-LLM/blob/b171e879563ff0ba4eb35b94cf0e59a471e13d80/docs/source/advanced/gpt-attention.md#paged-kv-cache">https://github.com/NVIDIA/TensorRT-LLM/blob/b171e879563ff0ba4eb35b94cf0e59a471e13d80/docs/source/advanced/gpt-attention.md#paged-kv-cache</a></li>
                </ol>
                <br></br>
            </div>
        )
    }
}