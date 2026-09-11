---
layout: post
lang: en
translation_key: oci-everything
title: "Everything → OCI? Do We Need Separate Maven, PyPI, and npm Repositories?"
description: "Helm and OpenTofu already use OCI registries for more than containers. Maven, PyPI, and npm may eventually share a universal storage layer too."
deck: "OCI will not replace Maven, PyPI, and npm as ecosystems. It could become their shared layer for artifact storage and distribution."
date: 2026-09-07 12:00:00 +0000
date_label: September 7, 2026
category: Infrastructure
author: Mikhail Fufaev
categories:
  - devops
  - infrastructure
  - architecture
tags:
  - oci
  - jfrog
  - artifactory
  - maven
  - pypi
  - npm
  - helm
  - opentofu
  - oras
permalink: /en/blog/oci-everything/
alternate_url: /blog/oci-everything/
image: /assets/images/posts/oci-everything/cover.webp
image_alt: "A black duck in a yellow hard hat at a container terminal, where Java, Python, npm, Helm, and OpenTofu are headed for OCI"
---

At a previous job, we had to move away from JFrog — because it was “the enemy.” We did not manage to get rid of it completely.

That is not surprising. JFrog Artifactory is far more than a place to put a file and download it again. It is a large artifact ecosystem: proxying external repositories, caching, search, metadata for different formats, policies, security, access control, lifecycle management, and much more.

But while looking at possible replacements, I had another thought. What if, over time, we stop using separate, ecosystem-specific artifact stores in favour of a universal OCI layer? Not Maven, PyPI, or npm as ecosystems — the idea that each of them must have its own physical storage layer. That process seems to be starting already.

## Historically, everyone had their own repository

We are used to a picture like this:

```text
Java        → Maven repository
Python      → PyPI repository
JavaScript  → npm registry
Helm        → chart repository
Containers  → OCI registry
```

Every ecosystem developed its own way to publish packages, find versions, retrieve metadata, and download content. Maven knows about `groupId`, `artifactId`, versions, POMs, and snapshots. PyPI knows Python packages, wheels, source distributions, and its index. npm knows package metadata, semver, dist-tags, and tarballs. Helm knows charts. Docker registries know container images.

At first glance, these are genuinely different worlds. But below the package-manager layer, a question appears: is the actual job of storing and delivering bytes really that different?

> In the end, almost everywhere we need the same things: upload a binary object, retrieve it, identify its contents, check integrity, retain versions, attach metadata, control access, replicate, cache, and link one artifact to another.

OCI turns out to be a surprisingly good common denominator.

## Helm has already made the move

With Helm, this transition has effectively happened. Helm 3 can store charts in OCI-compatible registries, and OCI support has been enabled by default since Helm 3.8. Instead of a separate chart repository, you can use the same kind of registry that already holds container images.

Helm remains Helm for the user: we still work with charts, versions, and dependencies, and use `helm push`, `helm pull`, and `helm install`. The chart can simply live physically in an OCI registry.

> OCI does not replace Helm semantics. It replaces the lower storage and distribution layer.

Helm itself knows it is handling a chart. The registry hardly needs to know. See the [Helm documentation on OCI registries](https://helm.sh/docs/topics/registries/).

## OpenTofu goes further

OpenTofu uses OCI in several scenarios. Modules can be fetched directly from an OCI registry, while an OCI registry can act as a mirror for providers — an alternative source for provider binaries. Instead of contacting the original provider registry, OpenTofu can look for the needed provider in your internal OCI registry.

Its documentation specifically says these integrations target OCI Distribution 1.1. That is telling: this was the first specification version with explicit support for artifacts that are not container images. OCI is not being used incidentally or as a workaround. It is starting to be treated as a general distribution protocol. See [OCI Registry Integrations in the OpenTofu documentation](https://opentofu.org/docs/cli/oci_registries/).

## An OCI registry no longer has to mean Docker images

When we say “container registry,” we intuitively expect containers inside. Technically, the OCI model has long allowed a broader view. It has blobs, manifests, descriptors, digests, media types, annotations, tags, and relationships between objects.

A blob does not have to be a container-image layer. It is a binary object addressed by digest. A manifest describes the blobs belonging to an artifact and what they mean. A media type or artifact type lets the client tell what it is looking at.

> A container image is not the model itself. It is one specific artifact type built on the general OCI model.

## ORAS makes the idea explicit

ORAS literally means OCI Registry As Storage. The project is built around using an OCI registry for arbitrary artifacts rather than just container images.

```text
file
  ↓
blob
  ↓
manifest
  ↓
OCI registry
```

You can put an archive, a model, configuration, an SBOM, a signature, an attestation, or nearly any other binary artifact into a registry if you agree on how it is described. That makes OCI look less like a “Docker format” and more like a reasonably universal distribution system. Read more at [ORAS](https://oras.land/).

## So what stops Maven?

Historically, a Maven repository looks roughly like this:

```text
/com/example/my-library/1.2.3/
    my-library-1.2.3.jar
    my-library-1.2.3.pom
    my-library-1.2.3-sources.jar
    my-library-1.2.3-javadoc.jar
```

A client knows the coordinate `com.example:my-library:1.2.3` and turns it into a repository structure according to established rules. But Maven semantics do not require those files to physically sit in that exact HTTP directory. You need a layer that understands `groupId`, `artifactId`, versions, classifiers, POMs, and metadata. Under that layer, the artifacts can live anywhere — including OCI.

### maven-oci-registry

Seqera Labs has [maven-oci-registry](https://github.com/seqeralabs/maven-oci-registry), a Gradle plugin for publishing Maven artifacts to OCI-compatible registries and consuming them as dependencies.

On the outside, it remains Maven and Gradle:

```groovy
dependencies {
    implementation "com.example:my-library:1.0.0"
}
```

Inside, Maven coordinates are converted into OCI references:

```text
Maven:
com.example:my-library:1.0.0

          ↓

OCI:
registry.example.com/com-example/my-library:1.0.0
```

The plugin starts a local HTTP proxy that looks like a normal Maven repository to Gradle. Gradle makes the familiar request for a JAR path; the proxy parses the Maven coordinate, converts it into an OCI reference, downloads the artifact through OCI/ORAS, and returns it.

```text
Gradle
   │ Maven protocol / semantics
   ▼
Maven-compatible adapter
   │ OCI Distribution API
   ▼
OCI Registry
```

Gradle does not have to know that its physical store is an OCI registry. And the OCI registry does not have to fully understand Maven.

> Package semantics can live separately from artifact storage.

## Python can work the same way

Python has [PyOCI](https://github.com/AllexVeldman/pyoci). The idea is similar: users keep the regular `pip install some-package` workflow, or use a custom index through `--index-url`. pip sees a Python package index, while PyOCI acts as a proxy between the package manager and an OCI registry.

```text
pip
 │ Python package index protocol
 ▼
PyOCI
 │ OCI Distribution API
 ▼
OCI Registry
```

The Python packages reside physically in the OCI registry, and PyOCI translates between the two models. The interesting part of this design is that it does not force every package manager to understand OCI directly. The existing interface and ecosystem protocol can stay; only the backend changes.

## Not “everything becomes OCI,” but several layers

```text
              PACKAGE ECOSYSTEMS

       Maven      PyPI      npm      Helm
         │          │        │         │
         └──────────┴────────┴─────────┘
                      │
                      ▼
            protocols / adapters
                      │
                      ▼
               OCI Distribution
                      │
                      ▼
                object storage
```

A package manager remains a package manager. Maven still understands Maven coordinates, pip still understands Python packages, npm retains its metadata model, and Helm knows charts. But the lower layer becomes the same.

> OCI could become a universal storage and distribution layer beneath different package ecosystems.

## We are mixing two separate jobs

Today, a package repository usually answers two different questions at once.

1. **How do I find the package I need?** For `com.example:foo:1.2.3` or `requests==2.32.0`, we need package metadata, version resolution, dependency metadata, indexes, search, and ecosystem-specific semantics. That is the package-repository protocol's job.
2. **Where do the bytes physically live?** For `foo-1.2.3.jar`, we need upload and download, immutable identifiers, hashing, authentication, replication, caching, retention, and garbage collection. That is artifact storage and distribution.

Historically, one product usually implements both layers. Architecturally, they do not have to be the same thing.

Take Maven. Its logic has to understand `groupId`, `artifactId`, and versions; find POMs; resolve transitive dependencies; handle snapshots and classifiers; perhaps process metadata. OCI cannot do any of that — and does not need to. It needs to store `foo-1.2.3.jar`, `foo-1.2.3.pom`, and `foo-1.2.3-sources.jar` reliably and deliver them when asked.

The same applies to PyPI and npm. pip must receive candidate distributions, select a compatible wheel, and account for the Python version, platform, and dependencies. npm contains more than a tarball: package metadata, version metadata, dist-tags, and its own dependency model. The point is not to remove these systems. They could become the control plane above shared artifact storage.

```text
Maven API ──► Maven adapter ──┐
PyPI API  ──► PyPI adapter  ──┼──► OCI Registry ──► Object Storage
npm API   ──► npm adapter   ──┘       blobs, manifests, digests
Helm / OpenTofu ───────────────────►
```

Once every artifact is represented in one model, it can be easier to link a container image to an SBOM, signature, provenance, and vulnerability report. Why could we not link a Java library to sources, an SBOM, a signature, and provenance in the same way? Or a Python package to an SBOM, signature, and build provenance? OCI could provide a common language not only for storage, but also for relationships between artifacts.

## The infrastructure already exists

Nearly every modern platform already knows OCI registries: Harbor, GitHub Container Registry, GitLab Container Registry, AWS ECR, Google Artifact Registry, Azure Container Registry, Quay, Docker Hub, and many self-hosted implementations. Authentication, replication, cleanup policies, proxy and cache scenarios, object-storage backends, observability, and OCI tooling already exist.

> Rather than build separate storage infrastructure for every package ecosystem, we could use an existing OCI layer.

## But Harbor + ORAS do not replace JFrog yet

That would be too broad a conclusion. Artifactory solves far more problems than storing blobs: remote-repository proxying, caching, federation, metadata indexing, permissions, lifecycle policies, cleanup, package-specific search, security integrations, vulnerability scanning, promotion workflows, and enterprise governance.

An OCI registry by itself does not know how to resolve Maven snapshots, does not implement the PyPI Simple Repository API, does not understand npm dist-tags, and is not Maven Central. A bare OCI registry is not an Artifactory replacement.

But narrow the question to “where should artifacts physically be stored and how should they be delivered?” and it gets much more interesting. Why must `foo.jar` live in Maven-specific storage? Why must `package.whl` live in PyPI-specific storage? Why can a Helm chart be an OCI artifact while a Java library cannot? At the file level, there is no fundamental reason. The difference is one layer above.

## There will be problems

The most obvious one is ecosystem metadata. A package repository holds more than immutable artifacts: indexes, mutable metadata, aliases, snapshots, version selection rules, search, upstream proxies, promotion, and consistency constraints. A simple mapping of `package:version → OCI tag` solves only a small part of the problem.

Registries can also implement the OCI specification differently. Not all of them handle arbitrary artifacts equally well; searching and displaying non-container content is not always convenient; and garbage collection or retention policies can interact with package semantics in unexpected ways.

This is definitely not a story where `oras push foo.jar` means a Maven repository is no longer needed.

## In the end

Software development often follows a familiar path. A separate vertical stack appears for every task; then we realize most of the lower layer is the same everywhere. A shared primitive emerges: object storage for data, Git for source code, HTTP for enormous amounts of network interaction, the S3 API as a universal object-storage interface, and the Kubernetes API as a control plane for infrastructure objects.

Perhaps OCI is becoming that kind of primitive for software artifacts — not just container images, but anything produced by a build and meant to be distributed later. In that case, a container registry is really more of an Artifact Registry or a content-addressable distribution layer. The container image was simply the first mass user of this model.

I do not think everyone will delete Artifactory, Nexus, and every other package repository tomorrow and replace them with one Harbor. But the sequence is easy to imagine: OCI becomes the storage standard for container images, then Helm, infrastructure modules, signatures, SBOMs, and attestations; adapters appear for Maven and PyPI; then comes the question of why every ecosystem needs a separate blob-storage implementation.

```text
ecosystem semantics
        +
ecosystem protocol
        +
metadata / indexes
        │
        ▼
universal OCI distribution layer
```

Maven, PyPI, and npm are not going away. But they may stop being separate worlds at the storage layer. Not everything becomes a container — everything could become an OCI artifact.

> Will OCI become a shared low-level protocol for distributing software artifacts, while Maven, PyPI, npm, and the rest become specialised interfaces above one universal storage layer?

I would like to see it.

## Links

- [Helm — OCI registries](https://helm.sh/docs/topics/registries/)
- [OpenTofu — OCI Registry Integrations](https://opentofu.org/docs/cli/oci_registries/)
- [ORAS — OCI Registry As Storage](https://oras.land/)
- [Seqera Labs — maven-oci-registry](https://github.com/seqeralabs/maven-oci-registry)
- [PyOCI](https://github.com/AllexVeldman/pyoci)
