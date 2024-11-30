import React from 'react';
import Sharer from "../sharer";

import '../styles/fonts.css';
import '../styles/blog.css';

import dockerArch from "../images/dockerArch.png";
import vmsdocker from "../images/vmvsdocker.png";

export default class Ovac extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "On Virtualization and Containers | blog by Pranshu Gupta";
    }
    render() {
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-server bigger gt1"></i>
                </div>
                <h1 className="title">On Virtualization and Containers</h1>
                <p>Pranshu Gupta, Feb 20, 2019</p>
                <Sharer link={window.location.href} title={"On Virtualization and Containers"}></Sharer>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="roboto">Virtualization</h3>
                <p>
                    Virtualization is a mechanism to share hardware resources amongst multiple operating system instances on the same machine. These operating system instances are called Virtual Machines and are isolated from one another. This reduces the investment required in hardware resources, as the same hardware can now be shared by multiple VMs allowing high density deployments on a single server.
                    Virtualization is made possible by a thin layer of software called a Hypervisor that decouples the virtual machines from the host and dynamically allocates computing resources to each virtual machine as needed.
                </p>
                <p>
                    The only responsibility of the host operating system is to run the Hypervisor itself, no app deployments are usually done on the host OS. However, each of the OS instances incur licensing and maintenance costs. All the system calls and resources access requests by the VMs first go through the Hypervisor and the host OS, resulting in some overhead. VMWare came up with bare metal hypervisor which runs directly on the hardware, without any host OS, eliminating this overhead.
                </p>
                <p>
                    <b><i>VMware ESXi is a purpose-built bare-metal hypervisor that installs directly onto a physical server. With direct access to and control of underlying resources, ESXi is more efficient than hosted architectures and can effectively partition hardware to increase consolidation ratios and cut costs for our customers. - VMWare</i></b>
                </p>
                <h3 className="roboto">Types of Virtualization</h3>
                <p>
                    There are four types of virtualization – Paravirtualization, Hardware Assisted Virtualization, Full Virtualization and Hybrid Virtualization.
                </p>
                <p>
                    Paravirtualization is virtualization in which the guest operating system (the one being virtualized) is aware that it is a guest and accordingly has drivers that, instead of issuing hardware commands, simply issue commands directly to the host operating system. This also includes memory and thread management as well, which usually require unavailable privileged instructions in the processor.
                </p>
                <p>
                    Full Virtualization is virtualization in which the guest operating system is not aware that it is running on virtual hardware and issues hardware commands directly which are handled by the underlying hypervisor software running on the host operating system.
                </p>
                <p>
                    Hardware Assisted Virtualization is virtualization in which the microprocessor architecture supports special instructions to facilitate virtualization. These instructions might allow a virtual context to be setup so that the guest can execute privileged instructions directly on the processor without affecting the host.
                </p>
                <p>
                    Hybrid Virtualization is a mix of Paravirtualization and full virtualization where for privileged kernel commands, full virtualization is used, and for other tasks like IO, the guest OS directly issues commands to the host OS using the special drivers. Hybrid VMs often perform better than fully virtualized VMs.
                </p>
                <h3 className="roboto">Open Virtualization Format</h3>
                <p>
                    Open Virtualization Format is a standard that allows compliant virtual machine images to be interoperable and migratable across different vendors such as Azure, AWS, VMWare and VirtualBox.
                </p>
                <p>
                    OVF is a packaging format for virtual appliances. Once installed, an OVF package adds to the user’s infrastructure a self-contained, self-consistent, software application that provides a particular service or services. For example, an OVF package might contain a fully functional and tested web-server, database, and OS combination, such as a LAMP stack (Linux + Apache + MySQL + PHP), or it may contain a virus checker, including its update software, spyware detector, etc.
                </p>
                <p>
                    The OVF specification describes a hypervisor-neutral, efficient, extensible, and open format for the packaging and distribution of virtual appliances composed of one or more virtual systems. The OVF specification promotes customer confidence through the collaborative development of common standards for portability and interchange of virtual systems between different vendors’ virtualization platforms.
                </p>
                <p>
                    For more information on OVF, see the white
                    <a href="https://www.dmtf.org/sites/default/files/standards/documents/DSP2017_2.0.0.pdf"> paper</a>
                </p>
                <h3 className="roboto">Limitations of Virtualization</h3>
                <p>
                    Virtualization has its advantages but there are limitations too, some of them are as follows:
                    <ol>
                        <li> No concept incremental versioning or layers in virtualization, that means if there is a patch or update, the full VM image needs be downloaded and deployed again</li>
                        <li> No centralized repository for VM images, reuse opportunities are minimal</li>
                        <li> Not suitable for modern DevOps workflow</li>
                        <li> Hypervisor server does not support clusters by itself. An external load balancer is needed</li>
                        <li> Deploying web/micro services on VMs is costly because of low density deployments One way is to deploy multiple services on the same host, but this is bad practice, because it makes maintenance and failure detection difficult</li>
                        <li> Provisioning and bootstrapping VMs is time consuming so it is not suitable for real time workloads For example, dynamic scaling in real time will be very difficult because creating and deploying new VMs takes time</li>
                        <li> Vendor specific toolset is required for administration of virtual environments</li>
                        <li> VMs are costly because of OS licensing and low-density utilization of underlying hardware</li>
                        <li> VMs are difficult to migrate unless they were created using OVF</li>
                    </ol>
                </p>
                <h2 className="roboto">Docker Containers</h2>
                <p>
                    Containers are isolated execution environments which share the operating system resources. Virtualization at the operating system level can be regarded as containerization. The operating system takes care of providing the virtual environments where the applications run with isolation as if each application was running on a separate OS instance.
                    </p>
                <p style={{ textAlign: "center" }}>
                    <img alt="" src={vmsdocker} className="img-fluid" ></img>
                            Image Source: <a href="https://www.docker.com/resources/what-container">https://www.docker.com/resources/what-container</a>
                </p>
                <h3 className="roboto">Building Blocks of Docker</h3>
                <p>
                    Docker is a software that is used to containerize applications. It uses features like Namespace, CGroup, Union File System and NetLink, all available on Linux. We also have native docker containers on Windows server. <br></br>
                    <a href="https://www.docker.com/products/windows-containers">https://www.docker.com/products/windows-containers</a>
                </p>
                <p>
                    Namespace is a feature of Linux kernel which partitions kernel resources such that one set of processes can see one set of resources while another set of processes can see a different set of resources. Control Groups is a feature of Linux kernel that is used to limit, manage and monitor the usage of the resources by a process or a set of process. These features are very important for containerization because it allows Docker to create isolated execution contexts for different apps.
                    </p>
                <p>
                    Union file system is filesystem service for Linux which allows different filesystems to be transparently overlaid and mounted as a single union filesystem. Contents of directories which have the same path within the merged branches will be seen together in a single merged directory, within the new, virtual filesystem.
                    </p>
                <p>
                    UFS helps avoid duplicating a complete set of files each time you run a container image because it creates a virtual file system from different sources, so that the container is oblivious to the underlying filesystem and can run in a decoupled way.
                    </p>
                <p>
                    NetLink is another Linux kernel feature that helps user space processes communicate with kernel space processes (Inter Process Communication). This feature is used by Docker engine to create container which have their own network, without exposing the underlying network of the host OS. This is done with the help of port forwarding. For example, two container apps can expose their port as 8080, while one of them forwards the network to the host’s port 8088 and the other to 8090 behind the scenes.
                    </p>
                <p>
                    All these features are used to implement the LibContainer library which powers the Docker Engine. This library is implemented in Go language.
                    </p>

                <h3 className="roboto">Docker Container Image</h3>
                <p>
                    An image is a read-only template with instructions for creating a Docker container. You might create your own images or you might only use those created by others and published in a registry. To build your own image, you create a Dockerfile with a simple syntax for defining the steps needed to create the image and run it. Each instruction in a Dockerfile creates a layer in the image. When you change the Dockerfile and rebuild the image, only those layers which have changed are rebuilt. This is part of what makes images so lightweight, small, and fast, when compared to other virtualization technologies.
                    </p>

                <h3 className="roboto">Docker Engine</h3>
                <p>
                    Docker Engine is a software that provides the runtime for container images. It is implemented on top the LibContainer library. It is also termed as Docker Host or Docker Runtime.
                    </p>
                <p style={{ textAlign: "center" }}>
                    <img alt="" src={dockerArch} className="img-fluid"></img>
                            Image Source: <a href="https://docs.docker.com/engine/docker-overview/#docker-architecture">https://docs.docker.com/engine/docker-overview/#docker-architecture </a>
                </p>

                <h3 className="roboto">Docker Hub</h3>
                <p>
                    Docker Hub is a public repository where you can share container images that you create as well as utilize those shared by others.
                    </p>

                <h3 className="roboto">Docker Compose</h3>
                <p>
                    Docker build is the utility to build container images. It uses a Dockerfile which defines the build configuration parameters and a “context” – which can be the files that you want to package as a container image.
                    </p>

                <h3 className="roboto">Docker Swarm</h3>
                <p>
                    Docker Swarm brings cluster management features to Docker Engine. Using docker swarm you can deploy and maintain a multitude of containers.
                    </p>

                <hr style={{ backgroundColor: "white" }}></hr>

                    To learn more about Docker, head over to: <a href="https://docs.docker.com/engine/docker-overview/">https://docs.docker.com/engine/docker-overview/</a>

                <hr style={{ backgroundColor: "white" }}></hr>
            </div>
        )
    }
}