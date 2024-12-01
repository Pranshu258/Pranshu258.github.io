import React from 'react';
import Sharer from "../sharer";
import '../styles/fonts.css';
import '../styles/blog.css';

export default class Eohl extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Evolution of Human Languages | blog by Pranshu Gupta";
    }
    render() {
        return (
            <div>
                <div className="row bhead">
                    <i className="fas fa-language bigger gt1"></i>
                </div>
                <h1 className="title">Evolution of Human Languages</h1>
                <p>Pranshu Gupta, May 5, 2017</p>
                <Sharer link={window.location.href} title={"Evolution of Human Languages"}></Sharer>
                <p className="introduction">
                    Language is an essential part of our existence enabling us to transfer unlimited non-genetic information among individuals. But how, when and why exactly did we evolve to acquire the faculty of language is still unknown. Among the many theories that have been proposed to explain the evolution of language, some notable ones are – Mirror System, Computational, Technological and Cultural Hypothesis.
                    </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h3 className="headings">Mirror Neuron Theory of Language Evolution</h3>
                <p>
                    This theory proposes that primitive language evolved from manual gestures. Gestures, both speech, and manual are governed by the mirror neuron system. Mirror neurons help us understand actions that others perform by mapping them to actions that we can perform ourselves.<br></br>
                        However, unlike in other primates, the mirror system in human beings has been reported to respond both to transitive and intransitive actions (actions which do not have a related object). As time passed, this must have allowed us to use gestures to communicate about things other than food, such as abstract concepts. (Fadiga, Fogassi, Pavesi, and Rizzolatti, 1995).<br></br>
                        It has been reported that speech and manual gestures share a grounding in the mirror neuron system, hinting that the manual gestures gradually developed into orofacial gestures and were eventually accompanied by speech via movements of the tongue and vocal tract. Another evidence supporting this hypothesis are the homologous areas in the monkey and the human brain. Area F5 in monkeys (involved in gestures of grasping an object with either hands or mouth) and Premotor Area 6 in humans (involved in orofacial musculature control). Thus, bridging manual gestures in monkeys and facial gestures in humans. (Petrides, Cadoret, and Mackey, 2005)<br></br>
                        Also, the mirror neurons do not fire up for vocalization in non-human primates so it can be said that human speech evolved from manual gestures rather than primate calls and it was a gradual process of natural selection. [1]
                    </p>
                <h3 className="headings">Computational Theory of Language Evolution</h3>
                <p>
                    This theory relies on the notion of Faculty of Language in Broad and Narrow senses i.e. FLB and FLN respectively. According to Chomsky FLB is an inclusive term which incorporates all the capacities that support language regardless to them being specific to language and uniquely human.<br></br>
                        FLN is a subset of FLB that is supposed to be language specific as well as uniquely human. According to Chomsky, FLN at least contains the capacity of recursion.<br></br>
                        If a population consists of individuals each of whom speaks a particular language. When they talk to each other, a successful communication will fulfill some objective, resulting in a payoff. This payoff contributes to the well-being of the society as a whole. The offspring inherit a language learning mechanism and an innate Universal Grammar that encompasses all the languages in the population. Thus, helping them to communicate and continue the flow of knowledge. However, inheritance is indeed subject to mutation and in the same way, learning is to subject to mistakes. This creates a selective dynamic that enforces the development and spread of the languages that give higher payoffs in the society leading to the cultural evolution of language.<br></br>
                        E. Mark Gold proved that language acquisition is impossible for a child in an unrestricted search space with the poverty of stimulus. So, there must be some underlying concept that defines and restricts the space of human languages. This concept is called Universal Grammar and it is supposed to be innate.<br></br>
                        However, the UG is also subject to change - during the evolution of primates, there was a succession of UGs that finally led to the UG of currently living humans and at some point, a UG emerged that allowed human languages to have unlimited power of expression. [2] [3]
                    </p>
                <h3 className="headings">Technological Hypothesis of Language Evolution</h3>
                <p>
                    Although language is concerned with efficient communication among the members of our species, it is can be argued that it is a highly developed extension of our goal-directed behavior. This involves actions and thoughts related to our everyday tasks, which must be selected and coordinated in a hierarchical manner so that the task is executed successfully. And in this process of selection and coordination of actions and thoughts syntax must play a very crucial part because whatever action we perform the brain processes it step by step similar to syntax.<br></br>
                        It has been established that Broca’s Area (BA) in our brain has very important role in the processing of linguistic syntax. An experimental study was conducted by Clerget et al. to understand the role of BA in the execution of manual tasks. They discovered that BA is much more activated when we do goal oriented or transitive tasks (opening a cupboard with a key) rather than intransitive ones (ex. touching one’s nose). This suggests that linguistic syntax and goal oriented behavior are somehow related.<br></br>
                        This is also evident in the word order of most of the world’s languages subject–object–verb (SOV) and subject–verb–object (SVO). It can be said that this was derived from the role of BA in the sequencing of biological actions.<br></br>
                        “From an evolutionary perspective, once BA 44 [and perhaps Broca’s network in general] became adept at extracting the skeletal structure of goal-directed actions, it could then apply that ability to other cognitive domains” – Kemmerer<br></br>
                        As the capacity for hierarchical complexity increased, it drove manual gesture and linguistic complexity forward together, indicating a parallel evolution between language and manual praxis with syntax as the common substrate.<br></br>
                        For early man, the most important biological action was stone tool making. It has been proved that tool making is a highly complex action that involves a very good understanding of stone types, hitting angles along with controlled coordination of both the hands. (Geribàs, Mosquera, and Vergès, 2010)<br></br>
                        It is widely accepted that natural selection must have been in favor of individuals with better capabilities at stone tool making. Such selection, in turn, must have favored more complex neural systems which have now evolved to become various parts of the Broca’s Area in the modern human brain. Thus eventually expanding to incorporate other communicative and linguistic functions. [4]
                    </p>
                <h3 className="headings">Cultural Influence on Language Evolution</h3>
                <p>
                    The most striking evidence of cultural influence on the evolution of language is Pirahã. Pirahã culture constrains the communication to the intermediate experience of the interlocutors. So, the language does not have words for abstract terms. There is no concept of counting, colors, and creation of stories. They generally don’t talk about the past or the future. The language also lacks recursion which is supposed to be a very important aspect of human language that differentiates it from the communication techniques of other species.<br></br>
                        Also, after being in regular contact for 200 years with Brazilian people who speak Portuguese, Pirahã people still are monolingual. This is mainly attributed to the incompatibility of the two languages because of the cultural constraints. It has been shown, however, that the Pirahã people do not lack the cognitive capabilities to communicate without these constraints. There are many of them who were raised in urban Brazil and they speak Portuguese perfectly fine without any of those constraints. So, the features in the Pirahã language are largely due to the culture of the people and not their intelligence.
                        Therefore, culture is indeed an important factor in the evolution of language. [5]
                    </p>
                <h3 className="headings">Role of Selective Evolution</h3>
                <p>
                    Selective Evolution is a system that makes selections from a set of diverse variants. The selected ones are given a chance for survival and the rest perish. Natural selection is supposed to have laid out the groundwork by selecting individuals that were better at cognition and other mechanisms that underlie FLB.<br></br>
                        Sexual selection supports individuals who use complex language by making them more attractive to potential mates. But, the language in humans does not appear to be sexually selected because the capabilities related to language are distributed equally between both the genders and language acquisition in child happens way before puberty.<br></br>
                        Kin selection satisfactorily answers some of the concerns raised in the case of sexual selection. First of all the communication is supposed to be honest because with kin, it goes beyond personal motive. However we don’t just communicate with kin, we also communicate with strangers on a regular basis. This is comparatively rare in other species. [6]
                    </p>
                <h3 className="headings">Points of Convergence and Divergence</h3>
                <ol>
                    <li>Almost all the noteworthy theories of language evolution consider the important role played by selective dynamics in the evolution of modern human languages.</li>
                    <li>Languages change on three time scales: individual, social and genetic. The change due to individual learning being the fastest and that due to genetic changes in the species being the slowest. This is pretty much agreed upon by all the theories.</li>
                    <li>According to mirror neuron theory as well as the technological hypothesis, manual actions are related to speech in one or the other way.</li>
                    <li>
                        Different theories approach language evolution in different ways. The mirror neuron hypothesis tries to explain language evolution by studying neural responses for gestures, signs, and vocalizations. Technological Hypothesis emphasizes more on the Broca's Area and related parts of the brain to understand language. On the other hand, computational theory of evolution tries to explain things by defining a proper structure of human language and the dynamics involved in its acquisition and spread in society.
                        </li>
                    <li>
                        The theory of cultural influence on language evolution brings forward a counter-example for the notion that a human language must exhibit the property of recursion. However, in recent years this has been a highly debated issue. Many researchers insist that Pirahã is just an exception and can't be used to challenge the necessity of recursion in human language. On the other hand, some say that it is a linguistic fossil. But still, its importance can never be disregarded.
                        </li>
                    <li>
                        Another evidence against the theory that speech originated from primate calls is that monkeys apparently lack the theory of mind. They are unable to make intentional calls which are of huge importance in human language – the intention to pass a message. [6]
                        </li>
                    <li>
                        The concept of speech being special and unique to human beings as an ability has been challenged in many ways. It has been found that extensively trained parrots can imitate human speech and also link the sounds to the corresponding real world referents (Herman et al. 1993). However, no evidence has been found for syntax and structuring of such speech in parrots.
                        </li>
                </ol>
                <h3 className="headings">Conclusion</h3>
                <p>
                    The study of language evolution has come far from its beginning but it still has a long way to go. Unlike its early days, researchers from different disciplines are coming together to understand the evolution of language. Because language does not fossilize, comparative studies and understanding the brain and human genome are becoming more and more important in order to progress in this field. Researchers have found a gene called FOXP2 [6] which plays a significant role in proper functioning of language faculty in humans. Its exact function is still debatable but its discovery is a milestone. We can certainly say that the research is going in the positive direction and we might be able to answer some of the questions in the future.<br></br>
                        One more aspect of language that is important is writing. Writing is a very recent development in human history, about five thousand years or so (Egyptian civilization). And in this case, fortunately, we do have concrete evidence in form of old manuscripts and parchments found in excavations.<br></br>
                        According to Chomsky our ability to read and write is not an adaptation, but it is a combined result of the skills related to vision, hand movements along with our understanding of language [2]. Take the example of an illiterate person, generally, he/she will be very adept in verbal communication but unable to read and write. That doesn't mean that such a person is genetically impaired. A span of a few thousand years is very short for specialized adaptations. Reading and writing requires extensive training and involves the development of correct neural pathways across multiple parts of the brain. Also, unlike speech, there is no age limit for acquiring this ability.<br></br>
                        However, there is no denying that in future we might develop specialized adaptations for reading and writing as well. Manual gestures, facial expressions, sign languages, speech, writing, and typing - we have come so far from our ancestors. We will definitely go further unless we stage our own extinction by destroying the ecosystem we thrive in.
                    </p>
                <h3 className="headings">References</h3>
                <ol>
                    <li>Mirror neurons and the evolution of language – Michael C. Corballis</li>
                    <li>The evolution of the language faculty: Clarifications and implications – Fitch, Hauser, Chomsky</li>
                    <li>Computational and evolutionary aspects of language – Nowak, Komarova, Niyogi</li>
                    <li>Manual praxis in stone tool manufacture: Implications for language evolution – Lana Ruck</li>
                    <li>Cultural Constraints on Grammar and Cognition in Pirahã – Daniel L. Everett</li>
                    <li>The evolution of language: a comparative review – W. Tecumseh Fitch</li>
                </ol>
                <br></br>
            </div>
        )
    }
}