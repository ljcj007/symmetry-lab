# Inspect advanced calculation certificates with shared examples

Each link opens a particular example in its calculator. Load the example, review the JSON and run the calculation. Share the same link with a classmate to reproduce the result.

| Example | What to inspect in the result |
| --- | --- |
| [Z and affine classes of a six-dimensional noncyclic group](../#compute/advanced/carat_integral?preset=noncyclic-affine) | There are two Z classes and two affine classes. Inspect their separate completeness fields and certificates. |
| [Normalizer of a glued six-dimensional integral lattice](../#compute/advanced/integral_normalizer?preset=glued6) | Check that the group is infinite, inspect the completeness certificate and verify the checks on the 742 generators. The generator count describes the returned generating set. |
| [Arithmetic centralizer for six-dimensional A₅](../#compute/advanced/arithmetic_centralizer?preset=a5) | Inspect the rank-two integral order, the two verified generators of its unit group, and the Pell certificate for the quadratic order. |
| [Antiferromagnetic half-translation corepresentations in BNS 1.3](../#compute/advanced/symbolic_spacegroups?preset=magnetic) | Check the antiunitary operations, returned corepresentations, and verification status at BC wave vector `(1/2,0,0)`. |

For the integral classification, find the evidence distinguishing the two representatives, then compare the completeness certificates for Z and affine classes. For the normalizer, check the condition for one matrix and then trace how the certificate accounts for all possible transformations. Each certificate applies to the input and algorithm used for that calculation.

Find the symbolic space-group tool by searching for `BNS 1.3 corepresentation` or `Kramers corepresentation`. See the input scope for [integral classification](integral-classification.md), [normalizers](integral-normalizer.md), [arithmetic centralizers](arithmetic-centralizer.md), and [symbolic space groups](symbolic-spacegroups.md).
