# LucidPlayground

Lucid Playground is an interactive feature visualization interface, providing some of [Lucid's](https://github.com/tensorflow/lucid) functionality in the browser.
It uses the [LucidJS](https://github.com/stefsietz/LucidJS) library, which is based on[Tensorflow JS](https://www.tensorflow.org/js).
Obviously the name and the format are strongly inspired by [Tensorflow Playground](https://playground.tensorflow.org).

Be sure to read [Feature Visualization](https://distill.pub/2017/feature-visualization/) and the other related [Distill](https://distill.pub) articles to get some more information about the underlying concepts.

## Installation

1. Clone
```
git clone https://github.com/stefsietz/LucidPlayground.git
cd LucidPlayground
```

2. Install NPM packages
```
npm install
```
(Obviously you need npm installed)

3. Download [models](https://drive.google.com/open?id=1RWZMHFMFnUMKCwHybUCEONC4HiScsuTM)
and put them into the public directory (structure should be src/public/models/[AlexNet|...]).

4. Run
```
npm start
```

## How to Cite
If you find this work useful, please consider using the follwing citing template:

```

@inproceedings{Sietzen:2019,
  author = {Stefan Sietzen, Manuela Waldner},
	title = {Interactive Feature Visualization in the Browser},
	journal = {Proceedings of the Workshop on Visualization for AI explainability (VISxAI)},
	year = {2019},
	editors = {Mennatallah El-Assady, Duen Horng (Polo) Chau, Fred Hohman, Adam Perer, Hendrik Strobelt, Fernanda Viégas}
	url = {http://visxai.stefansietzen.at/}
}


```
