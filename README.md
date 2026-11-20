# Theoretical Catalysis Group website (Ziyun Wang, University of Auckland)

Static site served by GitHub Pages. `index.html` is the storybook version (3D home planet,
field pages, people pages); `classic.html` is the plain version.

Publications come from OpenAlex by ORCID 0000-0002-2817-8367: the pages fetch them live,
and a nightly workflow refreshes the fallback snapshot `data/publications.json`.
Paper categories can be corrected in `data/categories.json` (DOI -> ml / dft / exp).
