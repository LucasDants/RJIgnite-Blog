import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <main className={commonStyles.container}>
        <strong>Carregando...</strong>
      </main>
    );
  }

  const postWords = post.data.content
    .reduce((acc, content) => {
      return acc + content.body;
    }, '')
    .split(' ').length;

  const readingTime = Math.ceil(postWords / 200);

  return (
    <>
      <Head>
        <title> Slug | SpaceTraveling </title>
      </Head>
      <img
        src="https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F2fbacb7a-e460-44a3-8fc5-e66f96dae148%2Fcover-reactjs.png?table=block&id=b1a3645d-286b-4eec-93f5-f1f5476d0ff7&spaceId=08f749ff-d06d-49a8-a488-9846e081b224&width=2000&userId=51726d10-a3bc-4c2f-82a6-dd023e21e7d7&cache=v2"
        alt=""
        className={styles.banner}
      />
      <main className={commonStyles.container}>
        <div className={styles.container}>
          <strong>{post.data.title}</strong>
          <time>
            <FiCalendar /> {post.first_publication_date}
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
            <>
              <h1>{content.heading}</h1>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
            </>
          ))}
        </article>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const readingTime =
    response.data.content
      .reduce((acc, content) => {
        RichText.asText(content.body);
        return acc + RichText.asText(content.body);
      }, '')
      .split(' ').length / 200;

  return {
    props: {
      post: {
        first_publication_date: format(
          new Date(response.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          title: response.data.title,
          banner: {
            url: response.data.banner.url,
          },
          author: response.data.title,
          content: response.data.content.map(content => ({
            heading: content.heading,
            body: RichText.asHtml(content.body),
          })),
        },
      },
      readingTime: Math.ceil(readingTime),
    },
    revalidate: 60 * 60 * 24,
  };
};
