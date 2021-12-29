/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import Link from 'next/link';
import { useEffect } from 'react';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface LinkPost {
  slug: string;
  title: string;
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: LinkPost | null;
  nextPost: LinkPost | null;
}

export default function Post({ post, preview, nextPost, prevPost }: PostProps) {
  const router = useRouter();

  useEffect(() => {
    if (!router.isFallback) {
      const script = document.createElement('script');
      const anchor = document.getElementById('inject-comments-for-uterances');
      script.setAttribute('src', 'https://utteranc.es/client.js');
      script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('async', 'true');
      script.setAttribute('repo', 'LucasDants/RJIgnite-utterances');
      script.setAttribute('issue-term', 'pathname');
      script.setAttribute('theme', 'dark-blue');
      anchor.appendChild(script);
    }
  }, [router.isFallback]);

  if (router.isFallback) {
    return (
      <main className={commonStyles.container}>
        <strong>Carregando...</strong>
      </main>
    );
  }

  const postWords = post.data.content
    .reduce((acc, content) => {
      return acc + RichText.asText(content.body) + content.heading;
    }, '')
    .split(' ').length;

  const readingTime = Math.ceil(postWords / 200);

  return (
    <>
      <Head>
        <title> Slug | SpaceTraveling </title>
      </Head>
      <img src={post.data.banner.url} alt="" className={styles.banner} />
      <main className={commonStyles.container}>
        <div className={styles.container}>
          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
          <strong>{post.data.title}</strong>
          <time>
            <FiCalendar />{' '}
            {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
              locale: ptBR,
            })}
          </time>
          <span>
            <FiUser /> {post.data.author}
          </span>
          <span>
            <FiClock /> {readingTime} min
          </span>
        </div>
        <article className={styles.content}>
          {post.data.content.map(content => (
            <div key={content.heading}>
              <h1>{content.heading}</h1>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </div>
          ))}
        </article>
        <div className={styles.divider} />
        <footer className={styles.footer}>
          <div className={styles.prevPost}>
            {prevPost && (
              <>
                <p>{prevPost.title}</p>
                <Link href={`/post/${prevPost.slug}`}>
                  <a>Post anterior</a>
                </Link>
              </>
            )}
          </div>
          <div className={styles.nextPost}>
            {nextPost && (
              <>
                <p>{nextPost.title}</p>
                <Link href={`/post/${nextPost.slug}`}>
                  <a>Próximo Post</a>
                </Link>
              </>
            )}
          </div>
        </footer>
        <div id="inject-comments-for-uterances" />
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // const prismic = getPrismicClient();
  // const posts = await prismic.query(TODO);

  return {
    paths: [
      {
        params: {
          slug: 'como-utilizar-hooks',
        },
      },
      {
        params: {
          slug: 'criando-um-app-cra-do-zero',
        },
      },
    ],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
      ref: previewData?.ref ?? null,
    }
  );

  const indexPost = posts.results.findIndex(post => post.uid === response.uid);

  const prevPost = posts.results[indexPost - 1];
  const nextPost = posts.results[indexPost + 1];

  return {
    props: {
      prevPost: prevPost
        ? {
            slug: prevPost.uid,
            title: prevPost?.data.title,
          }
        : null,
      post: {
        first_publication_date: response.first_publication_date,
        uid: response.uid,
        data: {
          title: response.data.title,
          subtitle: response.data.subtitle,
          banner: {
            url: response.data.banner.url,
          },
          author: response.data.author,
          content: response.data.content.map(content => ({
            heading: content.heading,
            body: content.body,
          })),
        },
      },
      nextPost: nextPost
        ? {
            slug: nextPost.uid,
            title: nextPost?.data.title,
          }
        : null,
      preview,
    },
    revalidate: 60 * 60 * 24,
  };
};
