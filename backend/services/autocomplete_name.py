from services.db_connection import create_connection

def get_area_suggestions(input_text):
    conn = create_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT area_name, district_name
        FROM areas
        WHERE area_name LIKE %s
        LIMIT 10
    """
    like_text = input_text + "%"
    cursor.execute(query, (like_text,))
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return results
