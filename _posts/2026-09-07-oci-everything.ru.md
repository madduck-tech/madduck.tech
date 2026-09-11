---
layout: post
lang: ru
translation_key: oci-everything
title: "Всё → OCI? Нужны ли нам отдельные хранилища для Maven, PyPI и npm"
description: "Helm и OpenTofu уже используют OCI Registry не только для контейнеров. Возможно, Maven, PyPI и npm тоже получат универсальный слой хранения."
deck: "OCI не заменит Maven, PyPI и npm как экосистемы, но может стать общим слоем хранения и доставки их артефактов."
date: 2026-09-07 12:00:00 +0000
date_label: 7 сентября 2026
category: Инфраструктура
author: Михаил Фуфаев
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
permalink: /blog/oci-everything/
alternate_url: /en/blog/oci-everything/
image: /assets/images/posts/oci-everything/cover.webp
image_alt: "Чёрная утка в жёлтой каске на контейнерном терминале, где Java, Python, npm, Helm и OpenTofu отправляются в OCI"
---

На прошлой работе у нас была задача уйти с JFrog — потому что «вражеский». Полностью отказаться от него тогда не получилось.

И это неудивительно. JFrog Artifactory — не просто место, куда можно положить файл, а потом скачать его обратно. Это большая экосистема вокруг артефактов: проксирование внешних репозиториев, кэширование, поиск, метаданные разных форматов, политики, безопасность, права доступа, управление жизненным циклом и ещё много всего.

Но, разбираясь с возможными заменами, я подумал: а что, если со временем мы вообще начнём отказываться от отдельных специфичных хранилищ артефактов в пользу универсального OCI-слоя? Не от Maven, PyPI или npm как экосистем, а от идеи, что каждой из них обязательно нужен собственный физический storage layer. Кажется, этот процесс уже понемногу идёт.

## Исторически у каждого был свой репозиторий

Мы привыкли к такой картине:

```text
Java        → Maven repository
Python      → PyPI repository
JavaScript  → npm registry
Helm        → chart repository
Containers  → OCI registry
```

У каждой экосистемы появился собственный способ публиковать пакеты, искать версии, получать метаданные и скачивать содержимое. Maven знает про `groupId`, `artifactId`, version, POM и snapshots. PyPI — про Python packages, wheels, source distributions и свой индекс. npm — про package metadata, semver, dist-tags и tarballs. Helm — про charts. Docker registry — про container images.

На первый взгляд это разные миры. Но ниже уровня package manager возникает вопрос: настолько ли различается сама задача хранения и доставки байтов?

> В итоге почти везде нужно одно и то же: загрузить бинарный объект, получить его обратно, идентифицировать содержимое, проверить целостность, хранить версии, прикреплять метаданные, ограничивать доступ, реплицировать, кэшировать и связывать один артефакт с другим.

И здесь OCI оказывается неожиданно хорошим общим знаменателем.

## Helm уже смог

С Helm этот переход фактически уже произошёл. Начиная с Helm 3 чарты можно хранить в OCI-compatible registries, а с Helm 3.8 поддержка OCI включена по умолчанию. Вместо отдельного chart repository можно использовать тот же registry, в котором уже лежат контейнерные образы.

Для пользователя Helm остаётся Helm: мы всё ещё работаем с chart'ами, версиями и зависимостями, используем `helm push`, `helm pull` и `helm install`. Просто физически chart теперь может лежать в OCI registry.

> OCI не заменяет семантику Helm. Он заменяет нижний слой хранения и доставки.

Helm сам знает, что перед ним chart. Registry знать это почти не обязательно. Подробнее — в [документации Helm по OCI registries](https://helm.sh/docs/topics/registries/).

## OpenTofu пошёл ещё дальше

OpenTofu использует OCI в нескольких сценариях. Модули можно получать непосредственно из OCI registry, а для providers OCI registry может быть mirror — альтернативным источником бинарников provider'ов. Вместо обращения к исходному provider registry OpenTofu может искать нужный provider во внутреннем OCI registry.

В документации отдельно сказано, что интеграции рассчитаны на OCI Distribution 1.1. Это показательно: в этой версии спецификации появилась явная поддержка артефактов, которые не являются container images. OCI используется не случайно и не как обходной путь — он начинает рассматриваться как универсальный distribution protocol. См. [OCI Registry Integrations в документации OpenTofu](https://opentofu.org/docs/cli/oci_registries/).

## OCI registry уже не обязательно означает Docker images

Когда мы говорим «container registry», кажется, что внутри должны лежать контейнеры. Но технически OCI-модель давно шире. В ней есть blobs, manifests, descriptors, digests, media types, annotations, tags и связи между объектами.

Blob не обязан быть слоем контейнерного образа: это бинарный объект, адресуемый по digest. Manifest описывает blobs, относящиеся к артефакту, и их назначение. Media type или artifact type позволяет клиенту понять, что перед ним.

> Container image — не сама модель, а один конкретный тип артефакта поверх общей OCI-модели.

## ORAS делает эту идею явной

ORAS расшифровывается как OCI Registry As Storage. Основная идея проекта — использовать OCI registry для произвольных артефактов, а не только контейнерных образов.

```text
file
  ↓
blob
  ↓
manifest
  ↓
OCI registry
```

В registry можно положить архив, модель, конфигурацию, SBOM, подпись, attestation или почти любой другой бинарный артефакт, если договориться о его описании. Поэтому OCI начинает выглядеть не как «формат Docker», а как достаточно универсальная система distribution. Подробнее — на [сайте ORAS](https://oras.land/).

## Тогда что мешает Maven?

Исторически Maven repository выглядит примерно так:

```text
/com/example/my-library/1.2.3/
    my-library-1.2.3.jar
    my-library-1.2.3.pom
    my-library-1.2.3-sources.jar
    my-library-1.2.3-javadoc.jar
```

Клиент знает координаты `com.example:my-library:1.2.3` и по правилам превращает их в структуру repository. Но Maven-семантика не требует, чтобы файлы физически лежали именно в таком HTTP-каталоге. Нужен слой, который понимает `groupId`, `artifactId`, version, classifier, POM и metadata. Под ним артефакты могут храниться где угодно — например, в OCI.

### maven-oci-registry

У Seqera Labs есть [maven-oci-registry](https://github.com/seqeralabs/maven-oci-registry): Gradle plugin для публикации Maven artifacts в OCI-compatible registry и использования их как зависимостей.

Снаружи всё остаётся Maven/Gradle:

```groovy
dependencies {
    implementation "com.example:my-library:1.0.0"
}
```

Внутри Maven coordinates преобразуются в OCI references:

```text
Maven:
com.example:my-library:1.0.0

          ↓

OCI:
registry.example.com/com-example/my-library:1.0.0
```

Plugin поднимает локальный HTTP proxy, который выглядит для Gradle как обычный Maven repository. Gradle делает привычный запрос к пути JAR; proxy разбирает Maven coordinate, преобразует его в OCI reference, скачивает artifact через OCI/ORAS и отдаёт его обратно.

```text
Gradle
   │ Maven protocol / semantics
   ▼
Maven-compatible adapter
   │ OCI Distribution API
   ▼
OCI Registry
```

Gradle не обязан знать, что физическое хранилище — OCI registry. А OCI registry не обязан полноценно понимать Maven.

> Package semantics могут жить отдельно от artifact storage.

## То же можно сделать с Python

В Python есть [PyOCI](https://github.com/AllexVeldman/pyoci). Идея похожая: для пользователя остаётся обычный `pip install some-package` или custom index через `--index-url`. Для pip перед ним Python package index, но PyOCI выступает proxy между package manager и OCI registry.

```text
pip
 │ Python package index protocol
 ▼
PyOCI
 │ OCI Distribution API
 ▼
OCI Registry
```

Python packages физически находятся в OCI registry, а PyOCI преобразует одну модель в другую. Эта архитектура интересна тем, что не заставляет каждый package manager понимать OCI напрямую. Можно сохранить существующие интерфейс и ecosystem protocol — меняется только backend.

## Не «всё станет OCI», а несколько слоёв

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

Package manager остаётся package manager'ом. Maven понимает Maven coordinates, pip — Python packages, npm работает со своей моделью metadata, Helm знает chart. Но нижний слой становится одинаковым.

> OCI может стать универсальным storage/distribution layer под разными package ecosystems.

## Мы смешиваем две разные задачи

Сегодня package repository обычно отвечает сразу на два вопроса.

1. **Как найти нужный пакет?** Для `com.example:foo:1.2.3` или `requests==2.32.0` нужны package metadata, version resolution, dependency metadata, индексы, поиск и ecosystem-specific semantics. Это задача package repository protocol.
2. **Где физически лежат байты?** Для `foo-1.2.3.jar` нужны upload и download, immutable identifiers, hashing, authentication, replication, caching, retention и garbage collection. Это задача artifact storage/distribution.

Исторически оба слоя обычно реализует один продукт, но архитектурно они вовсе не обязаны быть одним и тем же.

Возьмём Maven. Логика должна понимать `groupId`, `artifactId`, version, находить POM, разрешать transitive dependencies, учитывать snapshots, classifiers и metadata. OCI ничего этого не умеет — и не обязан. Он должен надёжно хранить `foo-1.2.3.jar`, `foo-1.2.3.pom` и `foo-1.2.3-sources.jar` и отдавать их по запросу.

То же относится к PyPI и npm. pip должен получить подходящие distributions, выбрать совместимый wheel и учесть версию Python, платформу и зависимости. npm хранит не только tarball, но и package metadata, version metadata, dist-tags и собственную dependency model. Эти системы не нужно удалять: скорее они могут стать control plane над общим artifact storage.

```text
Maven API ──► Maven adapter ──┐
PyPI API  ──► PyPI adapter  ──┼──► OCI Registry ──► Object Storage
npm API   ──► npm adapter   ──┘       blobs, manifests, digests
Helm / OpenTofu ───────────────────►
```

Когда все артефакты оказываются в одной модели, проще связывать container image с SBOM, signature, provenance и vulnerability report. Почему тем же способом нельзя связать Java library с sources, SBOM, signature и provenance? Или Python package с SBOM, signature и build provenance? OCI может дать общий язык не только для хранения, но и для связей между артефактами.

## Инфраструктура уже существует

Современная инфраструктура умеет работать с OCI registries: Harbor, GitHub Container Registry, GitLab Container Registry, AWS ECR, Google Artifact Registry, Azure Container Registry, Quay, Docker Hub и множество self-hosted implementations. Уже есть authentication, replication, cleanup policies, proxy/cache сценарии, object storage backend, observability и tooling вокруг OCI.

> Вместо отдельной storage infrastructure для каждой package ecosystem можно использовать уже существующий OCI layer.

## Но Harbor + ORAS пока не заменяют JFrog

Это было бы слишком сильным выводом. Artifactory решает намного больше задач, чем хранение blobs: proxy удалённых repositories, caching, federation, metadata indexing, permissions, lifecycle policies, cleanup, package-specific search, security integrations, vulnerability scanning, promotion workflows и enterprise governance.

OCI registry сам по себе не знает, как разрешать Maven snapshots, не реализует PyPI Simple Repository API, не понимает npm dist-tags и не является Maven Central. Голый OCI registry — не замена Artifactory.

Но если сузить вопрос до «где физически хранить и как доставлять артефакты?», всё становится интереснее. Почему `foo.jar` обязан лежать в Maven-specific storage? Почему `package.whl` должен жить в PyPI-specific storage? Почему Helm chart может быть OCI artifact, а Java library — обязательно нет? На уровне файлов фундаментальной причины нет. Разница находится уровнем выше.

## Возможные проблемы

Самая очевидная — ecosystem metadata. Package repository хранит не только immutable artifacts: там есть индексы, mutable metadata, aliases, snapshots, version selection, поиск, upstream proxy, promotion и особенности consistency. Простое соответствие `package:version → OCI tag` покрывает лишь небольшую часть задачи.

Кроме того, registries могут по-разному реализовывать OCI specification. Не все одинаково хорошо работают с произвольными artifacts, не везде удобно искать и показывать non-container content, а garbage collection и retention policies могут неожиданно пересекаться с package semantics.

Это не история уровня `oras push foo.jar`, после которой Maven repository больше не нужен.

## В итоге

В разработке часто сначала возникает вертикальный stack для каждой задачи, а потом оказывается, что большая часть нижнего слоя у всех одинакова. Появляется общий primitive: object storage для данных, Git для исходников, HTTP для сетевого взаимодействия, S3 API как универсальный интерфейс object storage, Kubernetes API как control plane для инфраструктурных объектов.

Возможно, OCI постепенно становится таким primitive для software artifacts — не только container images, а всего, что появляется при сборке и потом должно распространяться. Тогда container registry становится скорее Artifact Registry или content-addressable distribution layer. Container image просто был первым массовым пользователем модели.

Я не думаю, что завтра все удалят Artifactory, Nexus и остальные package repositories и заменят их одним Harbor. Но процесс вполне можно представить: OCI становится storage для container images, затем для Helm, infrastructure modules, signatures, SBOM и attestations; появляются adapters для Maven и PyPI; а потом возникает вопрос, зачем каждой ecosystem отдельная реализация blob storage.

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

Maven, PyPI и npm никуда не исчезнут. Но они могут перестать быть отдельными мирами на уровне хранения. Не всё станет контейнером — всё может стать OCI artifact.

> Станет ли OCI общим низкоуровневым протоколом распространения software artifacts, а Maven, PyPI, npm и остальные package ecosystems — специализированными интерфейсами над одним универсальным storage layer?

Я бы на это посмотрел.

## Ссылки

- [Helm — OCI registries](https://helm.sh/docs/topics/registries/)
- [OpenTofu — OCI Registry Integrations](https://opentofu.org/docs/cli/oci_registries/)
- [ORAS — OCI Registry As Storage](https://oras.land/)
- [Seqera Labs — maven-oci-registry](https://github.com/seqeralabs/maven-oci-registry)
- [PyOCI](https://github.com/AllexVeldman/pyoci)
