import React from 'react';
import Sharer from '../sharer';
import '../styles/fonts.css';
import '../styles/blog.css';

export default class DNS extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Understanding the Domain Name System | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-network-wired bigger gt1"></i>
                </div>
                <h1 className="title">Understanding the Domain Name System</h1>
                <p>Pranshu Gupta, Oct 13, 2024</p>
                <Sharer link={window.location.href} title={"Understanding the Domain Name System"}></Sharer>
                <br></br>
                <p className="introduction">
                    The purpose of DNS is to introduce levels of inderiction between a resource and its location, along with convenience for humans and internet applications. For example, it is much easier to remember the name of the the server (www.microsoft.com) as compared to its actual location (an IP address such as 142.250.69.196).
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Architecture</h3>
                <p>There are two main components of DNS: </p>
                <ol>
                    <li>DNS Name Servers - these servers act as information repositories, storing various DNS resource records.</li>
                    <li>DNS Resolvers - DNS resolvers  are responsible for initiating and sequencing the queries leading to a full resolution of the domain into an IP address.</li>
                </ol>
                
                <h4 className="headings">Name Space</h4>
                <p>The DNS name space is organized as a variable depth rooted tree. Each node in this tree has an associated label which is case insensitive. For example: &quot;azure.microsoft.com&quot; is domain name with &quot;com&quot; as the root. In the DNS tree, the node associated with &quot;com&quot; has many children. Many domain names,  &quot;<a style={{ textAlign: "left", color: "black", fontSize: "inherit" }}href="http://www.microsoft.com">www.microsoft.com</a>&quot;, &quot;<a style={{ textAlign: "left", color: "black", fontSize: "inherit" }}href="http://www.google.com">www.google.com</a>&quot;, &quot;<a style={{ textAlign: "left", color: "black", fontSize: "inherit" }}href="http://www.netflix.com">www.netflix.com</a>&quot;, all end with &quot;.com&quot; in their domain names, so all of them will have nodes as children of &quot;com&quot;.</p>
                <h4 className="headings">Resource Records</h4>
                <p>There are several kinds of DNS resource records. Some of the important ones are explained below:</p>
                <ol>
                    <li>(A) Address Record - The primary function of the address record is to map a domain name to an IPv4 address. A records do not support IPv6 addresses, which are stored as AAAA records. </li>
                    <li>(NS) Name Server Record - An NS record is a type of DNS record that specifies the authoritative name server servers for a domain. A domain often has multiple NS records to ensure reliability. </li>
                    <li>(MX) Mail Exchange Record - The mail exchange record is used to map an email domain to the IP address of the mail server for that domain. </li>
                    <li>(PTR) Pointer Record - A PTR record is used for reverse DNS lookups, which start with an IP address and lookup the domain name. They are often used in email servers to verify sender&#39;s domain name and combat spam and phishing attacks. </li>
                    <li>(CNAME) Canonical Name Recors - CNAME record maps an alias domain name to a canonical (true) domain name. For example &quot;microsoft.com&quot; is an alias for &quot;www.microsoft.com&quot;. CNAME records are commonly used for subdomains like &quot;www&quot; that should resolve to the same ip address as the main domain.</li>
                </ol>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">DNS Database Distribution</h3>
                <p>The DNS database does not live on a single server, instead it is distributed across the internet via name servers, DNS zones and DNS caches. The separation between DNS zone and Caches is invisible to users/apps. </p>
                <h4 className="headings">DNS Zones</h4>
                <p>A DNS zone is a distinct segment of a DNS namespace that is managed by a specific organization or admisnitrator. It allows for more granular control over the DNS components in that segment. A zone stores resource records for the labels, and pointers to all other contiguous zones for that namespace.</p>
                <p>For example, the domain &quot;microsoft.com&quot; might have a DNS zone that includes records for &quot;<a style={{ textAlign: "left", color: "black", fontSize: "inherit" }}href="http://www.microsoft.com">www.microsoft.com</a>&quot;, &quot;azure.microsoft.com&quot; and &quot;windows.microsoft.com&quot;, and some other subdomains. </p>
                <h4 className="headings">DNS Cache</h4>
                <p>Each name server aggressively caches everything it can. Each resource record has its own TTL (time to live), after which the cached record expires and it must be fetched from the authoritative name server again. High TTL values reduce load on name servers, but low TTL values reduce inconsistencies.</p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">DNS Communication Protocol</h3>
                <p>DNS uses a UDP based datagram protocol with retransmissions. </p>
                <blockquote>
                    <p><strong>Note:</strong> What is UDP? UDP sends messages without establishing a connection between the client and the server. This makes UDP faster but less reliable. UDP does not guarantee delivery, order or protection against duplicates. It is used for time-sensitive applications such as online gaming, and DNS lookups. </p>
                </blockquote>
                <h4 className="headings">DNS in Virtual Networks</h4>
                <p>There are several approaches to manage and resolve domain names within a virtual network: </p>
                <ol>
                    <li>Private DNS Zones - Private DNS zones can be used to manage and resolve domain names with in the virtual network without exposing them to public internet.</li>
                    <li>Dustom DNS Server - Private DNS zones are ideal for resolving names within the same virtual network, while custom DNS servers might be necessary for more complex scenarios involving multiple networks or hybrid environments.</li>
                </ol>
                
                <h4 className="headings">DNS in Dual Stack Networks</h4>
                <blockquote>
                    <p><strong>Note:</strong> Dual Stack Network is a network environment that supports both IPv4 and IPv6 protocols simultaneously. This allows devices and applications to communicate using either protocol, facilitating smoother transition from IPv4 to the newer IPv6.</p>
                </blockquote>
                <p>Dual stacked systems are usually deployed in phases: </p>
                <ol>
                    <li>IPv4 always allowed. IPv6 connections allowed only for resources internal to the virtual network. </li>
                    <li>IPv4 always allowed. IPv6 connections allowed only for some resources outside the virtual network. </li>
                    <li>IPv4 always allowed. IPv6 connections always allowed.</li>
                </ol>
                
                <p>Enabling dual-stack in your environment without enablong full end-to-end connectivity to all IPv6 destinations will not only affect those IPv6 destinations but also IPv4 destinations that also have IPv6 options. This is because most operating systems will choose IPv6 connection if available, but a dual stack service in initial phases of deployment might only allow IPv6 connections within its virtual network. This will result in a failed connection attempt, after which the operating system will fall back to IPv4. This has a negative impact on request latency. </p>
                <p>There are two ways to solve this latency issue:</p>
                <ol>
                    <li>Modify the settings of the operating system, so that it prefers IPv4. </li>
                    <li>Filter DNS responses to only allow IPv4 records to be returned.</li>
                </ol>
                
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Security for DNS</h3>
                <p>DNS uses UDP as the default protocol, which uses plain text to transmit data across the network. This is concerning for security and privacy reasons. Anyone who has tools to monitor transmissions can read the DNS queries being made by the user. Also, if DNS queries are not private, it becomes easier for governments to censor the internet and for attackers to stalk users&#39; online activities.</p>
                <h4 className="headings">DNS over TLS (DoT)</h4>
                <p>DoT adds TLS encryption on top of the user datagram protocol. DoT uses a dedicated port 853, which means anyone with network visibility can see DoT traffic volume, but not the contents.</p>
                <h4 className="headings">DNS over HTTPS (DoH)</h4>
                <p>DoH is an alternative to DoT, that uses the HTTPS to encrypt the DNS traffic. Because DoH uses the standard HTTPS port 443, the DNS traffic becomes indistinguishable from normal user traffic. </p>
                <p>DoH is preferable from a privacy perspective, where even network administrators can not isolate DNS traffic. However, DoT is preferred from a security perspective, because it uses a dedicated port, giving network admins ability to monitor and block DNS queries if the network is under attack.</p>
                <h4 className="headings">DNS Cache Poisoning</h4>
                <p>Attackers can poison a DNS cache by tricking the DNS resolver into caching false information. As a result, the resolver will send an incorrect IP address to the client, leading users to a wrong and possibly malicious website. </p>
                <h4 className="headings">DNS Secure Portocol (DNSSEC)</h4>
                <p>DNSSEC is a security protocol to mitigate various security concerns for DNS by digitally signing data to help ensure its validity. DNSSEC implements a heirarchical digital signing policy across all layers of DNS.</p>
                <p>For example, in case of &quot;azure.microsoft.com&quot; lookup, a root DNS server would sign a key for the &quot;.com&quot; nameserver, and the &quot;.com&quot; nameserver wouls then sign a key for &quot;microsoft.com&quot; nameserver. The &quot;microsoft.com&quot; authoritative nameserver would in turn sign the nameserver for &quot;azure.microsoft.com&quot; (assuming there are subdomains within Azure which are served by a dedicated nameserver).</p>
                <p>This creates a parent-child train of trust that travels all the way up to the root zone. To close the chain of trust, the root zone itself needs to be validated, which is done using human intervention (in a ceremony known as &quot;root zone signing ceremony&quot;).  </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">References</h3>
                <ol>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/">https://ocw.mit.edu/courses/6-829-computer-networks-fall-2002/</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances?tabs=redhat">https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances?tabs=redhat</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://aws.amazon.com/blogs/networking-and-content-delivery/how-to-optimize-dns-for-dual-stack-networks/">https://aws.amazon.com/blogs/networking-and-content-delivery/how-to-optimize-dns-for-dual-stack-networks/</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://www.cloudflare.com/learning/dns/dns-cache-poisoning/">https://www.cloudflare.com/learning/dns/dns-cache-poisoning/</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://www.cloudflare.com/learning/dns/dns-over-tls/">https://www.cloudflare.com/learning/dns/dns-over-tls/</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://www.cloudflare.com/learning/dns/dns-security/">https://www.cloudflare.com/learning/dns/dns-security/</a></li>
                    <li><a style={{ textAlign: "left", color: "black", fontSize: "inherit" }} href="https://blog.cloudflare.com/dnssec-an-introduction/">https://blog.cloudflare.com/dnssec-an-introduction/</a></li>
                </ol>
                
            </div>
        )
    }
}