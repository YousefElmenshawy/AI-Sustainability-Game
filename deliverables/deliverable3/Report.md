# Deliverable 3 Report

**Course:** CISC 440 — Artificial Intelligence (Spring 2026)  
**Project:** Tommie EcoOps: Campus Grid

---

## Assigned Paper

[2311.12385](https://arxiv.org/abs/2311.12385)

---

## Paper Reference

| Field | Value |
|---|---|
| **arXiv ID** | [2311.12385](https://arxiv.org/abs/2311.12385) |
| **Title** | Joint-Space Multi-Robot Motion Planning with Learned Decentralized Heuristics |
| **Authors** | Fengze Xie, Marcus Dominguez-Kuhne, Benjamin Riviere, Jialin Song, Wolfgang Hönig, Soon-Jo Chung, Yisong Yue |
| **Subject** | Robotics (cs.RO) |
| **Submitted** | November 2023 |

### Links (accessibility checked)

| Link | Status | URL |
|---|---|---|
| Abstract page | **Accessible** (HTTP 200) | https://arxiv.org/abs/2311.12385 |
| PDF download | **Accessible** (redirects normally) | https://arxiv.org/pdf/2311.12385.pdf |

> Verified March 2026: both URLs load successfully from arXiv.

---

## Report Summary

### Main idea

The main idea of this report is about the use of AI implemented methods that are used to train robots that can operate in groups of 4 or more to be effective in movement and route planning for search and rescue excursions, sea and space exploration, and movements on their own or in self-driven cars given a continuous dimension. Being able to move around in these dimensional environments takes into consideration steering and distance. These machine learning methods contribute to the use of a Rapidly exploring Random Tree (RRT), which is used in the robots planning process to move in these given spaces.

### Problem statement

The problem stated in the report is that there are limitations when working with multiple robots at once in a state space, especially when trying to work with 16 of them. The dimensions of the state space increase with each robot added, and it causes exponential time complexity issues when they are all trying to reach an end goal while moving simultaneously. Trying to find a successful solution to this problem is important because it would be much more efficient to use robots instead of human beings to send on search and rescue missions, especially in dangerous environments. A real-life example could be trying to rescue sea divers from deep water levels and avoid obstacles such as ridges or aquatic life in the way.

### Main approach

The main approach to the problem was using kinodynamic RRT. Given a distributed equation, the RRT samples a random state, finds the closest state in the search tree, then steers from that closest state to a random state, add finally adds that path to the tree if there is no collision. The RRT takes into use a centralized plan with a single robot before testing multiple, followed by a cost-to-go function to evaluate distance performance. After that, the RRT uses 2 decentralized heuristics for both steering and distance for joint space planning and guaranteeing completeness of a solution. The heuristics are trained based off of a neural network structure that trains the data collected. Once that is done, a weight using a goal bias and Euclidean distance is applied to the tree to find an optimal path solution that ensures completeness in a continuous space.

### Technical evolution

The approach to the problem is built first off of older ai methods before expanding to including newer methods. First, the method is built off making decisions using the tree structure and takes an unbiased tree as an input into the training. The problem takes time and space computation into consideration through an exploratory method instead of using exploitation, as uncertainty needs to be addressed before ensuring completeness. The heuristics are then modified through a newer ai technique of neural networks, influenced by imitation learning, to learn the data from the heuristics applied.

### Search algorithm connections

Different search aglorithim concepts are apparent to the report. For example, the idea of A* search is influenced in the heuristic estimates for steering and distance by tracking the cost toward the goal. Greedy search, while not directly used, is similar in concept to the goal biased training to reach the goal state the most efficiently without obstacles. UCS is also influenced by the idea of finding the nearest/lowest path cost when expanding the RRT. In addition to the heuristics, probability is applied to find a robust conclusion from uncertainty in paths. Finally, by using similar search algorithms and heuristics, the problem is solved from the planning of the state. The problem started with a state of 1 centralized robot to now allowing 16 robots to move within a 65-dimensional search space. By doing this, the research group found success in deconstructing the large spatial problem into more local exploration, adding the steer and distance probabilities towards the goal state.

### Connection to our project

Our project relates to the paper mostly in the aspect of applying heuristics and how our game traverses campus most effectively using the A* search algorithm. Like the robots in the report, our project takes heuristics and cost into decision processing to find the goal. The paper emphasizes that distance was the overall important factor to navigate through space, just as our project prioritizes distance more than cost from our results. Finally, our project is like the paper in terms of using a tree structure to expand nodes. Even though our project is more exploiting than exploratory, it still uses stochastic behavior in determining where to apply weights, which is similar to how the RRT uses random sample states starting out.

### Key takeaway

From the paper, the key takeaway is that heuristics play an essential role in reducing search complexity, especially in a continuous environment where obstacles can be uncertain. Despite modern AI methods doing the heavy work of problem solving nowadays, we see in the report that they are fundamental to older concepts and used the min early planning phases to handle computation in the state space. Even though older ai approaches may be outdated, they still contribute to agent success. This is especially important for resolving future issues to reduce excessive labor, exploration, and rescue operations.

---

## Citation (BibTeX)

```bibtex
@article{xie2023joint,
  title={Joint-Space Multi-Robot Motion Planning with Learned Decentralized Heuristics},
  author={Xie, Fengze and Dominguez-Kuhne, Marcus and Riviere, Benjamin and Song, Jialin and H{\"o}nig, Wolfgang and Chung, Soon-Jo and Yue, Yisong},
  journal={arXiv preprint arXiv:2311.12385},
  year={2023}
}
```

---

## Checklist

- [x] Paper ID: **2311.12385**
- [x] arXiv links verified accessible
- [x] Full report summary included (all sections above)
- [x] Connection to Tommie EcoOps included
